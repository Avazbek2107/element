from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Optional
from datetime import date, timedelta
from app.database import get_db
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.room import Room
from app.models.student import StudentProfile
from app.models.attendance import Attendance, AttendanceStatus
from app.models.test import Test, TestResult
from app.schemas.group import GroupCreate, GroupUpdate, GroupOut
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/groups", tags=["groups"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)

DAY_UZ = {
    "monday": "Dushanba", "tuesday": "Seshanba", "wednesday": "Chorshanba",
    "thursday": "Payshanba", "friday": "Juma", "saturday": "Shanba", "sunday": "Yakshanba",
}

def _time_str(entry) -> str:
    """Schedule entry → vaqt qatori. 'HH:MM-HH:MM' yoki {'time':..., 'room_id':...}"""
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict):
        return entry.get("time", "")
    return ""

def _room_id(entry) -> Optional[int]:
    if isinstance(entry, dict):
        return entry.get("room_id")
    return None

def _parse_range(s: str):
    """'09:00-11:00' → (9.0, 11.0)"""
    try:
        start, end = s.split("-")
        def f(t):
            h, m = t.strip().split(":")
            return int(h) + int(m) / 60
        return f(start), f(end)
    except Exception:
        return None, None

def _overlaps(ns, ne, os_, oe) -> bool:
    return ns < oe and os_ < ne

def _check_teacher_conflict(
    db: Session,
    teacher_id: int,
    schedule: dict,
    exclude_group_id: Optional[int] = None,
):
    if not teacher_id or not schedule:
        return
    query = db.query(Group).filter(Group.teacher_id == teacher_id, Group.is_active == True)
    if exclude_group_id:
        query = query.filter(Group.id != exclude_group_id)
    for other in query.all():
        if not other.schedule:
            continue
        for day, entry in schedule.items():
            if day not in other.schedule:
                continue
            ns, ne = _parse_range(_time_str(entry))
            os_, oe = _parse_range(_time_str(other.schedule[day]))
            if None in (ns, ne, os_, oe):
                continue
            if _overlaps(ns, ne, os_, oe):
                day_name = DAY_UZ.get(day, day)
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"O'qituvchi {day_name} kuni {_time_str(other.schedule[day])} vaqtida "
                        f"«{other.name}» guruhida dars beradi. "
                        f"Bir vaqtda bir nechta guruhga dars berib bo'lmaydi."
                    ),
                )

def _check_room_conflict(
    db: Session,
    schedule: dict,
    exclude_group_id: Optional[int] = None,
):
    if not schedule:
        return
    for day, entry in schedule.items():
        rid = _room_id(entry)
        if not rid:
            continue
        ns, ne = _parse_range(_time_str(entry))
        if None in (ns, ne):
            continue
        query = db.query(Group).filter(Group.is_active == True)
        if exclude_group_id:
            query = query.filter(Group.id != exclude_group_id)
        for other in query.all():
            if not other.schedule or day not in other.schedule:
                continue
            if _room_id(other.schedule[day]) != rid:
                continue
            os_, oe = _parse_range(_time_str(other.schedule[day]))
            if None in (os_, oe):
                continue
            if _overlaps(ns, ne, os_, oe):
                day_name = DAY_UZ.get(day, day)
                room = db.query(Room).filter(Room.id == rid).first()
                room_name = room.name if room else f"#{rid}"
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{day_name} kuni {_time_str(other.schedule[day])} vaqtida "
                        f"«{room_name}» xonasida «{other.name}» guruhining darsi bor. "
                        f"Bir vaqtda bitta xonaga ikki dars belgilanmaydi."
                    ),
                )


def _build_group_out(group: Group, db: Session) -> GroupOut:
    teacher_name = None
    if group.teacher:
        teacher_name = f"{group.teacher.first_name} {group.teacher.last_name}"
    student_count = db.query(StudentProfile).filter(
        StudentProfile.group_id == group.id
    ).count()
    return GroupOut(
        id=group.id,
        name=group.name,
        description=group.description,
        teacher_id=group.teacher_id,
        teacher_name=teacher_name,
        telegram_group_link=group.telegram_group_link,
        schedule=group.schedule,
        start_date=group.start_date,
        end_date=group.end_date,
        is_active=group.is_active,
        student_count=student_count,
    )


@router.get("", response_model=List[GroupOut])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    groups = db.query(Group).filter(Group.is_active == True).all()
    return [_build_group_out(g, db) for g in groups]


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    body: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    _check_teacher_conflict(db, body.teacher_id, body.schedule)
    _check_room_conflict(db, body.schedule)
    group = Group(**body.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return _build_group_out(group, db)


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    return _build_group_out(group, db)


@router.put("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: int,
    body: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")

    # Yangilanayotgan teacher_id va schedule ni aniqlash
    effective_teacher  = body.teacher_id  if body.teacher_id  is not None else group.teacher_id
    effective_schedule = body.schedule    if body.schedule    is not None else group.schedule
    _check_teacher_conflict(db, effective_teacher, effective_schedule, exclude_group_id=group_id)
    _check_room_conflict(db, effective_schedule, exclude_group_id=group_id)

    for key, value in body.model_dump(exclude_none=True).items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return _build_group_out(group, db)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    group.is_active = False
    db.commit()


@router.get("/{group_id}/report")
def get_group_report(
    group_id: int,
    date_from: Optional[date] = None,
    date_to:   Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")

    # Standart sana: oxirgi 30 kun
    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=30)

    # ── O'quvchilar ────────────────────────────────────────────
    students = db.query(StudentProfile).filter(
        StudentProfile.group_id == group_id
    ).all()
    student_ids = [s.id for s in students]

    # ── Yo'qlama (davr ichida) ─────────────────────────────────
    att_rows = (
        db.query(Attendance)
        .filter(
            Attendance.group_id == group_id,
            Attendance.date >= date_from,
            Attendance.date <= date_to,
        )
        .all()
    )

    # Necha ta unikal dars sanasi bor
    unique_dates = len({a.date for a in att_rows})

    # Har o'quvchi uchun yo'qlama hisob-kitobi
    att_by_student = {}
    for s in students:
        att_by_student[s.id] = {"present": 0, "absent": 0, "late": 0, "excused": 0}

    for a in att_rows:
        if a.student_id in att_by_student:
            key = a.status.value if hasattr(a.status, "value") else str(a.status)
            if key in att_by_student[a.student_id]:
                att_by_student[a.student_id][key] += 1

    # Umumiy yo'qlama summasi
    total_present  = sum(v["present"]  for v in att_by_student.values())
    total_absent   = sum(v["absent"]   for v in att_by_student.values())
    total_late     = sum(v["late"]     for v in att_by_student.values())
    total_excused  = sum(v["excused"]  for v in att_by_student.values())
    total_records  = total_present + total_absent + total_late + total_excused
    attend_rate    = round(total_present / total_records * 100, 1) if total_records else 0

    # ── Testlar ────────────────────────────────────────────────
    # Bu guruhga biriktirilgan testlar
    group_tests = db.query(Test).filter(
        Test.group_id == group_id,
        Test.is_published == True,
    ).all()
    test_ids = [t.id for t in group_tests]

    # Guruh o'quvchilarining test natijalari
    results = []
    if test_ids and student_ids:
        results = (
            db.query(TestResult)
            .filter(
                TestResult.test_id.in_(test_ids),
                TestResult.student_id.in_(student_ids),
                TestResult.status == "submitted",
            )
            .all()
        )

    avg_test_pct = (
        round(sum(float(r.percentage) for r in results) / len(results), 1)
        if results else None
    )

    # Har o'quvchi uchun test ko'rsatkichi
    test_by_student = {}
    for s in students:
        test_by_student[s.id] = {"taken": 0, "avg_pct": None, "_sum": 0}
    for r in results:
        if r.student_id in test_by_student:
            test_by_student[r.student_id]["taken"] += 1
            test_by_student[r.student_id]["_sum"] += float(r.percentage)
    for sid, v in test_by_student.items():
        if v["taken"] > 0:
            v["avg_pct"] = round(v["_sum"] / v["taken"], 1)

    # ── O'quvchilar ro'yxati ──────────────────────────────────
    student_list = []
    for s in students:
        att  = att_by_student[s.id]
        tst  = test_by_student[s.id]
        attended = att["present"] + att["late"]
        total_att = att["present"] + att["absent"] + att["late"] + att["excused"]
        student_list.append({
            "id":           s.id,
            "name":         f"{s.user.last_name} {s.user.first_name}" if s.user else f"ID:{s.id}",
            "present":      att["present"],
            "absent":       att["absent"],
            "late":         att["late"],
            "excused":      att["excused"],
            "attend_rate":  round(attended / total_att * 100, 1) if total_att else None,
            "tests_taken":  tst["taken"],
            "avg_test_pct": tst["avg_pct"],
        })

    # O'rtacha davomat bo'yicha saralash
    student_list.sort(key=lambda x: (x["absent"], -(x["attend_rate"] or 0)))

    teacher_name = None
    if group.teacher:
        teacher_name = f"{group.teacher.first_name} {group.teacher.last_name}"

    return {
        "group": {
            "id":           group.id,
            "name":         group.name,
            "teacher_name": teacher_name,
            "start_date":   str(group.start_date) if group.start_date else None,
            "end_date":     str(group.end_date)   if group.end_date   else None,
            "schedule":     group.schedule,
        },
        "period": {
            "date_from": str(date_from),
            "date_to":   str(date_to),
        },
        "summary": {
            "student_count":  len(students),
            "total_lessons":  unique_dates,
            "total_present":  total_present,
            "total_absent":   total_absent,
            "total_late":     total_late,
            "total_excused":  total_excused,
            "attend_rate":    attend_rate,
            "total_tests":    len(group_tests),
            "test_submissions": len(results),
            "avg_test_pct":   avg_test_pct,
        },
        "students": student_list,
    }


@router.post("/{group_id}/students/{student_id}", status_code=status.HTTP_200_OK)
def assign_student_to_group(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    profile.group_id = group_id
    db.commit()
    return {"message": "O'quvchi guruhga biriktirildi"}


@router.delete("/{group_id}/students/{student_id}", status_code=status.HTTP_200_OK)
def remove_student_from_group(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.id == student_id,
        StudentProfile.group_id == group_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi bu guruhda emas")
    profile.group_id = None
    db.commit()
    return {"message": "O'quvchi guruhdan chiqarildi"}
