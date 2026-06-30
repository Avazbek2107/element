from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.group import Group
from app.models.test import Test, TestResult, TestStatus, TestType
from app.models.attendance import Attendance, AttendanceStatus
from app.utils.auth import require_roles

router = APIRouter(prefix="/api/stats", tags=["stats"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)


@router.get("")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
    group_id: Optional[int] = Query(None),
):
    # ── Asosiy raqamlar ──────────────────────────────────────────
    students_total = db.query(StudentProfile).join(User).filter(User.is_active == True).count()
    students_with_group = db.query(StudentProfile).join(User).filter(
        User.is_active == True, StudentProfile.group_id.isnot(None)
    ).count()
    students_no_group = students_total - students_with_group

    teachers_total = db.query(User).filter(
        User.role == UserRole.teacher, User.is_active == True
    ).count()

    groups_total = db.query(Group).filter(Group.is_active == True).count()

    tests_total     = db.query(Test).count()
    tests_published = db.query(Test).filter(Test.is_published == True).count()
    tests_draft     = tests_total - tests_published

    results_total = db.query(TestResult).filter(TestResult.status == TestStatus.submitted).count()

    avg_row = db.query(func.avg(TestResult.percentage)).filter(
        TestResult.status == TestStatus.submitted
    ).scalar()
    avg_percentage = round(float(avg_row), 1) if avg_row else 0.0

    # ── Jins taqsimoti (group_id filtri) ─────────────────────────
    st_q = db.query(StudentProfile).join(User).filter(User.is_active == True)
    if group_id:
        st_q = st_q.filter(StudentProfile.group_id == group_id)

    male_count    = st_q.filter(StudentProfile.gender == "male").count()
    female_count  = st_q.filter(StudentProfile.gender == "female").count()
    filtered_total = male_count + female_count
    unknown_count = st_q.count() - filtered_total

    gender_stats = [
        {"name": "O'g'il", "value": male_count,   "color": "#3b82f6"},
        {"name": "Qiz",    "value": female_count,  "color": "#ec4899"},
    ]
    if unknown_count > 0:
        gender_stats.append({"name": "Noma'lum", "value": unknown_count, "color": "#9ca3af"})

    # ── Baho taqsimoti (group_id filtri) ─────────────────────────
    res_q = db.query(TestResult.percentage).filter(TestResult.status == TestStatus.submitted)
    if group_id:
        res_q = res_q.join(StudentProfile, TestResult.student_id == StudentProfile.id).filter(
            StudentProfile.group_id == group_id
        )
    percentages = [float(r[0]) for r in res_q.all()]
    grade_counts = {"A'lo": 0, "Yaxshi": 0, "O'rtacha": 0, "Yomon": 0}
    for pct in percentages:
        if pct >= 90:   grade_counts["A'lo"]     += 1
        elif pct >= 75: grade_counts["Yaxshi"]   += 1
        elif pct >= 50: grade_counts["O'rtacha"] += 1
        else:           grade_counts["Yomon"]    += 1

    grade_stats = [
        {"name": "A'lo",     "value": grade_counts["A'lo"],     "color": "#22c55e"},
        {"name": "Yaxshi",   "value": grade_counts["Yaxshi"],   "color": "#3b82f6"},
        {"name": "O'rtacha", "value": grade_counts["O'rtacha"], "color": "#f59e0b"},
        {"name": "Yomon",    "value": grade_counts["Yomon"],    "color": "#ef4444"},
    ]

    # ── Guruhlar bo'yicha o'quvchilar ────────────────────────────
    all_groups = db.query(Group).filter(Group.is_active == True).order_by(Group.name).all()
    group_stats = []
    for g in all_groups:
        cnt = db.query(StudentProfile).filter(
            StudentProfile.group_id == g.id
        ).count()
        group_stats.append({"name": g.name, "count": cnt})
    group_stats.sort(key=lambda x: x["count"], reverse=True)

    # ── Yo'qlama (so'nggi 7 kun) ─────────────────────────────────
    today = date.today()
    attendance_week = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        keldi    = db.query(Attendance).filter(
            Attendance.date == d, Attendance.status == AttendanceStatus.present
        ).count()
        kelmadi  = db.query(Attendance).filter(
            Attendance.date == d, Attendance.status == AttendanceStatus.absent
        ).count()
        kechikdi = db.query(Attendance).filter(
            Attendance.date == d, Attendance.status == AttendanceStatus.late
        ).count()
        attendance_week.append({
            "sana": d.strftime("%d/%m"),
            "keldi": keldi,
            "kelmadi": kelmadi,
            "kechikdi": kechikdi,
        })

    # ── Test turlari ─────────────────────────────────────────────
    type_labels = {
        TestType.practice: "Amaliyot",
        TestType.weekly:   "Haftalik",
        TestType.monthly:  "Oylik",
        TestType.final:    "Yakuniy",
    }
    test_type_stats = []
    for t_type, label in type_labels.items():
        pub   = db.query(Test).filter(Test.test_type == t_type, Test.is_published == True).count()
        draft = db.query(Test).filter(Test.test_type == t_type, Test.is_published == False).count()
        test_type_stats.append({"name": label, "nashr": pub, "qoralama": draft})

    # ── Barcha guruhlar (filter uchun) ───────────────────────────
    recent_groups = db.query(Group).filter(Group.is_active == True).order_by(Group.name).all()

    return {
        # Asosiy
        "students_total":      students_total,
        "students_with_group": students_with_group,
        "students_no_group":   students_no_group,
        "teachers_total":      teachers_total,
        "groups_total":        groups_total,
        "tests_total":         tests_total,
        "tests_published":     tests_published,
        "tests_draft":         tests_draft,
        "results_total":       results_total,
        "avg_percentage":      avg_percentage,
        # Diagrammalar
        "gender_stats":        gender_stats,
        "grade_stats":         grade_stats,
        "group_stats":         group_stats,
        "attendance_week":     attendance_week,
        "test_type_stats":     test_type_stats,
        # Ro'yxat
        "recent_groups": [
            {
                "id": g.id,
                "name": g.name,
                "student_count": db.query(StudentProfile).filter(StudentProfile.group_id == g.id).count(),
            }
            for g in recent_groups
        ],
    }
