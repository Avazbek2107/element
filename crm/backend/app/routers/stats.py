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
    db:           Session           = Depends(get_db),
    current_user: User              = Depends(AdminOrTeacher),
    group_id:     Optional[int]     = Query(None),
):
    is_teacher = current_user.role == UserRole.teacher

    # teacher uchun o'z guruhlari ID lari
    teacher_gids: Optional[list] = None
    if is_teacher:
        teacher_gids = [
            g.id for g in
            db.query(Group.id).filter(Group.teacher_id == current_user.id, Group.is_active == True).all()
        ]
        if group_id and group_id not in teacher_gids:
            group_id = None  # ruxsatsiz guruh — ignore

    # ── Asosiy raqamlar ──────────────────────────────────────────
    st_base = db.query(StudentProfile).join(User).filter(User.is_active == True)
    if teacher_gids is not None:
        st_base = st_base.filter(StudentProfile.group_id.in_(teacher_gids))

    students_total      = st_base.count()
    students_with_group = st_base.filter(StudentProfile.group_id.isnot(None)).count()
    students_no_group   = students_total - students_with_group

    if is_teacher:
        groups_total    = len(teacher_gids)
        teachers_total  = 0
    else:
        groups_total    = db.query(Group).filter(Group.is_active == True).count()
        teachers_total  = db.query(User).filter(User.role == UserRole.teacher, User.is_active == True).count()

    tests_total     = db.query(Test).count()
    tests_published = db.query(Test).filter(Test.is_published == True).count()
    tests_draft     = tests_total - tests_published

    results_total = db.query(TestResult).filter(TestResult.status == TestStatus.submitted).count()
    avg_row = db.query(func.avg(TestResult.percentage)).filter(
        TestResult.status == TestStatus.submitted
    ).scalar()
    avg_percentage = round(float(avg_row), 1) if avg_row else 0.0

    # ── Jins taqsimoti ─────────────────────────────────────────
    gender_q = db.query(StudentProfile).join(User).filter(User.is_active == True)
    if teacher_gids is not None:
        gender_q = gender_q.filter(StudentProfile.group_id.in_(teacher_gids))
    if group_id:
        gender_q = gender_q.filter(StudentProfile.group_id == group_id)

    male_count    = gender_q.filter(StudentProfile.gender == "male").count()
    female_count  = gender_q.filter(StudentProfile.gender == "female").count()
    unknown_count = gender_q.count() - male_count - female_count

    gender_stats = [
        {"name": "O'g'il", "value": male_count,   "color": "#3b82f6"},
        {"name": "Qiz",    "value": female_count,  "color": "#ec4899"},
    ]
    if unknown_count > 0:
        gender_stats.append({"name": "Noma'lum", "value": unknown_count, "color": "#9ca3af"})

    # ── Baho taqsimoti ──────────────────────────────────────────
    res_q = db.query(TestResult.percentage).filter(TestResult.status == TestStatus.submitted)
    if teacher_gids is not None or group_id:
        res_q = res_q.join(StudentProfile, TestResult.student_id == StudentProfile.id)
        if teacher_gids is not None:
            res_q = res_q.filter(StudentProfile.group_id.in_(teacher_gids))
        if group_id:
            res_q = res_q.filter(StudentProfile.group_id == group_id)

    percentages  = [float(r[0]) for r in res_q.all()]
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

    # ── Guruhlar bo'yicha o'quvchilar ───────────────────────────
    grp_q = db.query(Group).filter(Group.is_active == True)
    if teacher_gids is not None:
        grp_q = grp_q.filter(Group.id.in_(teacher_gids))
    all_groups = grp_q.order_by(Group.name).all()

    group_stats = sorted(
        [
            {"name": g.name, "count": db.query(StudentProfile).filter(StudentProfile.group_id == g.id).count()}
            for g in all_groups
        ],
        key=lambda x: x["count"],
        reverse=True,
    )

    # ── Yo'qlama (so'nggi 7 kun) ─────────────────────────────────
    today = date.today()
    attendance_week = []
    for i in range(6, -1, -1):
        d   = today - timedelta(days=i)
        att = db.query(Attendance).filter(Attendance.date == d)
        if teacher_gids is not None:
            att = att.filter(Attendance.group_id.in_(teacher_gids))
        keldi    = att.filter(Attendance.status == AttendanceStatus.present).count()
        kelmadi  = att.filter(Attendance.status == AttendanceStatus.absent).count()
        kechikdi = att.filter(Attendance.status == AttendanceStatus.late).count()
        attendance_week.append({
            "sana": d.strftime("%d/%m"),
            "keldi": keldi, "kelmadi": kelmadi, "kechikdi": kechikdi,
        })

    # ── Davomat dinamikasi (so'nggi 8 hafta) ─────────────────────
    attendance_trend = []
    week_start = today - timedelta(days=today.weekday())  # shu haftaning dushanbasi
    for i in range(7, -1, -1):
        w_start = week_start - timedelta(weeks=i)
        w_end   = w_start + timedelta(days=6)
        att_w = db.query(Attendance).filter(Attendance.date >= w_start, Attendance.date <= w_end)
        if teacher_gids is not None:
            att_w = att_w.filter(Attendance.group_id.in_(teacher_gids))
        if group_id:
            att_w = att_w.filter(Attendance.group_id == group_id)
        w_present = att_w.filter(Attendance.status == AttendanceStatus.present).count()
        w_late    = att_w.filter(Attendance.status == AttendanceStatus.late).count()
        w_total   = att_w.count()
        attendance_trend.append({
            "week": f"{w_start.strftime('%d.%m')}–{w_end.strftime('%d.%m')}",
            "rate": round((w_present + w_late) / w_total * 100, 1) if w_total else None,
        })

    # ── O'zlashtirish dinamikasi (so'nggi 6 oy) ──────────────────
    month_labels_uz = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"]
    score_trend = []
    for i in range(5, -1, -1):
        m_index = today.month - 1 - i
        y = today.year + (m_index // 12)
        m = (m_index % 12) + 1
        res_m = db.query(TestResult).filter(
            TestResult.status == TestStatus.submitted,
            func.extract('year', TestResult.submitted_at) == y,
            func.extract('month', TestResult.submitted_at) == m,
        )
        if teacher_gids is not None or group_id:
            res_m = res_m.join(StudentProfile, TestResult.student_id == StudentProfile.id)
            if teacher_gids is not None:
                res_m = res_m.filter(StudentProfile.group_id.in_(teacher_gids))
            if group_id:
                res_m = res_m.filter(StudentProfile.group_id == group_id)
        rows_m = res_m.all()
        avg_m = round(sum(float(r.percentage) for r in rows_m) / len(rows_m), 1) if rows_m else None
        score_trend.append({
            "month": f"{y}-{m:02d}",
            "label": f"{month_labels_uz[m-1]}",
            "avg_pct": avg_m,
            "count": len(rows_m),
        })

    # ── O'qituvchilar reytingi (faqat admin, guruh filtrsiz) ─────
    teacher_stats = None
    if not is_teacher and not group_id:
        teachers = db.query(User).filter(User.role == UserRole.teacher, User.is_active == True).all()
        teacher_stats = []
        for t in teachers:
            t_gids = [g.id for g in db.query(Group.id).filter(Group.teacher_id == t.id, Group.is_active == True).all()]
            if not t_gids:
                continue
            t_att = db.query(Attendance).filter(Attendance.group_id.in_(t_gids))
            t_present = t_att.filter(Attendance.status == AttendanceStatus.present).count()
            t_late    = t_att.filter(Attendance.status == AttendanceStatus.late).count()
            t_total   = t_att.count()
            t_res = (
                db.query(TestResult)
                .join(StudentProfile, TestResult.student_id == StudentProfile.id)
                .filter(StudentProfile.group_id.in_(t_gids), TestResult.status == TestStatus.submitted)
                .all()
            )
            teacher_stats.append({
                "teacher_name":    f"{t.first_name} {t.last_name}",
                "groups_count":    len(t_gids),
                "avg_attend_rate": round((t_present + t_late) / t_total * 100, 1) if t_total else None,
                "avg_test_pct":    round(sum(float(r.percentage) for r in t_res) / len(t_res), 1) if t_res else None,
            })
        teacher_stats.sort(key=lambda x: (x["avg_test_pct"] is None, -(x["avg_test_pct"] or 0)))

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

    return {
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
        "gender_stats":        gender_stats,
        "grade_stats":         grade_stats,
        "group_stats":         group_stats,
        "attendance_week":     attendance_week,
        "test_type_stats":     test_type_stats,
        "attendance_trend":    attendance_trend,
        "score_trend":         score_trend,
        "teacher_stats":       teacher_stats,
        "recent_groups": [
            {
                "id": g.id,
                "name": g.name,
                "student_count": db.query(StudentProfile).filter(StudentProfile.group_id == g.id).count(),
            }
            for g in all_groups
        ],
    }
