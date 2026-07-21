from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date as date_type

from app.database import get_db
from app.models.user import User, UserRole
from app.models.payment import Payment, PaymentStatus
from app.models.student import StudentProfile
from app.models.group import Group
from app.schemas.payment import PaymentCreate, PaymentBulkCreate, PaymentUpdate, PaymentOut, PaymentSummary
from app.utils.auth import require_roles
from app.utils.audit import log_action

router = APIRouter(prefix="/api/payments", tags=["payments"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher, module="payments")


def _teacher_group_ids(user: User, db: Session) -> list[int]:
    groups = db.query(Group.id).filter(Group.teacher_id == user.id, Group.is_active == True).all()
    return [g.id for g in groups]


def _check_group_access(user: User, group_id: int, db: Session):
    if user.role == UserRole.teacher:
        ids = _teacher_group_ids(user, db)
        if group_id not in ids:
            raise HTTPException(403, "Bu guruhga kirish ruxsati yo'q")


def _to_out(p: Payment) -> PaymentOut:
    student_name = ""
    if p.student and p.student.user:
        student_name = f"{p.student.user.first_name} {p.student.user.last_name}"
    return PaymentOut(
        id=p.id,
        student_id=p.student_id,
        student_name=student_name,
        group_id=p.group_id,
        group_name=p.group.name if p.group else None,
        amount=float(p.amount),
        paid_amount=float(p.paid_amount),
        month=p.month,
        year=p.year,
        status=p.status,
        payment_date=p.payment_date,
        note=p.note,
    )


@router.get("", response_model=List[PaymentOut])
def list_payments(
    month:    int           = Query(...),
    year:     int           = Query(...),
    group_id: Optional[int] = Query(None),
    status:   Optional[str] = Query(None),
    db:       Session       = Depends(get_db),
    current_user: User      = Depends(AdminOrTeacher),
):
    from sqlalchemy.orm import joinedload
    q = (
        db.query(Payment)
        .options(
            joinedload(Payment.student).joinedload(StudentProfile.user),
            joinedload(Payment.group),
        )
        .filter(Payment.month == month, Payment.year == year)
    )
    if group_id:
        _check_group_access(current_user, group_id, db)
        q = q.filter(Payment.group_id == group_id)
    elif current_user.role == UserRole.teacher:
        ids = _teacher_group_ids(current_user, db)
        q = q.filter(Payment.group_id.in_(ids))
    if status:
        q = q.filter(Payment.status == status)
    return [_to_out(p) for p in q.order_by(Payment.id).all()]


@router.get("/summary", response_model=PaymentSummary)
def payment_summary(
    month:    int           = Query(...),
    year:     int           = Query(...),
    group_id: Optional[int] = Query(None),
    db:       Session       = Depends(get_db),
    current_user: User      = Depends(AdminOrTeacher),
):
    q = db.query(Payment).filter(Payment.month == month, Payment.year == year)
    if group_id:
        _check_group_access(current_user, group_id, db)
        q = q.filter(Payment.group_id == group_id)
    elif current_user.role == UserRole.teacher:
        ids = _teacher_group_ids(current_user, db)
        q = q.filter(Payment.group_id.in_(ids))
    payments = q.all()

    paid    = sum(1 for p in payments if p.status == PaymentStatus.paid)
    partial = sum(1 for p in payments if p.status == PaymentStatus.partial)
    pending = sum(1 for p in payments if p.status == PaymentStatus.pending)
    total_amount = sum(float(p.amount) for p in payments)
    collected    = sum(float(p.paid_amount) for p in payments)

    return PaymentSummary(
        total_students=len(payments),
        paid=paid,
        partial=partial,
        pending=pending,
        total_amount=total_amount,
        collected=collected,
        remaining=total_amount - collected,
    )


MONTHS_UZ = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"]


@router.get("/report")
def payment_report(
    months:   int           = Query(6, ge=1, le=24),
    group_id: Optional[int] = Query(None),
    db:       Session       = Depends(get_db),
    current_user: User      = Depends(AdminOrTeacher),
):
    today = date_type.today()

    def _scoped(q):
        if group_id:
            _check_group_access(current_user, group_id, db)
            return q.filter(Payment.group_id == group_id)
        if current_user.role == UserRole.teacher:
            ids = _teacher_group_ids(current_user, db)
            return q.filter(Payment.group_id.in_(ids))
        return q

    # ── Oylik trend ────────────────────────────────────────────
    monthly = []
    for i in range(months - 1, -1, -1):
        m_index = today.month - 1 - i
        y = today.year + (m_index // 12)
        m = (m_index % 12) + 1
        rows = _scoped(db.query(Payment).filter(Payment.year == y, Payment.month == m)).all()
        total_amount = sum(float(p.amount) for p in rows)
        collected    = sum(float(p.paid_amount) for p in rows)
        monthly.append({
            "month":           f"{y}-{m:02d}",
            "label":           f"{MONTHS_UZ[m-1]} {y}",
            "total_amount":    total_amount,
            "collected":       collected,
            "remaining":       total_amount - collected,
            "collection_rate": round(collected / total_amount * 100, 1) if total_amount else None,
        })

    # ── Qarzdorlar (joriy + o'tgan davrdagi to'lanmagan yozuvlar) ──
    from sqlalchemy.orm import joinedload
    debt_rows = _scoped(
        db.query(Payment)
        .options(joinedload(Payment.student).joinedload(StudentProfile.user), joinedload(Payment.group))
        .filter(Payment.status.in_([PaymentStatus.pending, PaymentStatus.partial]))
    ).all()

    debtors_map: dict = {}
    for p in debt_rows:
        owed = float(p.amount) - float(p.paid_amount)
        if owed <= 0:
            continue
        entry = debtors_map.setdefault(p.student_id, {
            "student_id":    p.student_id,
            "student_name":  f"{p.student.user.first_name} {p.student.user.last_name}" if p.student and p.student.user else f"ID:{p.student_id}",
            "group_name":    p.group.name if p.group else None,
            "total_owed":    0.0,
            "unpaid_months": 0,
        })
        entry["total_owed"]    += owed
        entry["unpaid_months"] += 1

    debtors = sorted(debtors_map.values(), key=lambda x: -x["total_owed"])[:20]

    # ── Prognoz (so'nggi 3 oy o'rtachasi) ────────────────────────
    last3 = monthly[-3:] if len(monthly) >= 3 else monthly
    forecast_amount = round(sum(m["total_amount"] for m in last3) / len(last3), 0) if last3 else 0

    return {
        "monthly":  monthly,
        "debtors":  debtors,
        "forecast_next_month": {
            "expected_amount": forecast_amount,
            "note": "So'nggi 3 oy o'rtacha billing summasiga asoslangan taxminiy prognoz",
        },
    }


@router.post("", response_model=PaymentOut)
def create_payment(
    body:         PaymentCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, body.group_id, db)
    if body.group_id is not None:
        student = db.query(StudentProfile).filter(
            StudentProfile.id == body.student_id,
            StudentProfile.group_id == body.group_id,
        ).first()
        if not student:
            raise HTTPException(400, "O'quvchi bu guruhga tegishli emas")
    existing = db.query(Payment).filter(
        Payment.student_id == body.student_id,
        Payment.month == body.month,
        Payment.year  == body.year,
    ).first()
    if existing:
        raise HTTPException(400, "Bu o'quvchi uchun bu oy to'lovi allaqachon mavjud")

    p = Payment(
        student_id=body.student_id,
        group_id=body.group_id,
        amount=body.amount,
        paid_amount=0,
        month=body.month,
        year=body.year,
        status=PaymentStatus.pending,
        note=body.note,
    )
    db.add(p)
    db.flush()
    label = f"{p.student.user.first_name} {p.student.user.last_name}" if p.student and p.student.user else None
    log_action(db, current_user, "create", "payments", "payment", p.id, label,
               details={"month": p.month, "year": p.year, "amount": float(p.amount)})
    db.commit()
    db.refresh(p)
    from sqlalchemy.orm import joinedload
    p = db.query(Payment).options(
        joinedload(Payment.student).joinedload(StudentProfile.user),
        joinedload(Payment.group),
    ).filter(Payment.id == p.id).first()
    return _to_out(p)


@router.post("/bulk")
def bulk_create(
    body:         PaymentBulkCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, body.group_id, db)
    students = db.query(StudentProfile).filter(StudentProfile.group_id == body.group_id).all()
    if not students:
        raise HTTPException(404, "Bu guruhda o'quvchilar topilmadi")

    created = 0
    skipped = 0
    for s in students:
        existing = db.query(Payment).filter(
            Payment.student_id == s.id,
            Payment.month == body.month,
            Payment.year  == body.year,
        ).first()
        if existing:
            skipped += 1
            continue
        db.add(Payment(
            student_id=s.id,
            group_id=body.group_id,
            amount=body.amount,
            paid_amount=0,
            month=body.month,
            year=body.year,
            status=PaymentStatus.pending,
        ))
        created += 1

    log_action(db, current_user, "create", "payments", "payment_bulk", body.group_id, None,
               details={"month": body.month, "year": body.year, "created": created, "skipped": skipped})
    db.commit()
    return {"created": created, "skipped": skipped}


@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id:   int,
    body:         PaymentUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    from sqlalchemy.orm import joinedload
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(404, "To'lov topilmadi")
    _check_group_access(current_user, p.group_id, db)

    if body.paid_amount is not None:
        p.paid_amount = body.paid_amount
        if body.paid_amount >= float(p.amount):
            p.status = PaymentStatus.paid
            if not p.payment_date:
                p.payment_date = date_type.today()
        elif body.paid_amount > 0:
            p.status = PaymentStatus.partial
        else:
            p.status = PaymentStatus.pending

    if body.status is not None:
        p.status = body.status
        if body.status == PaymentStatus.paid:
            p.paid_amount = p.amount
            if not p.payment_date:
                p.payment_date = date_type.today()

    if body.payment_date is not None:
        p.payment_date = body.payment_date
    if body.note is not None:
        p.note = body.note

    label = f"{p.student.user.first_name} {p.student.user.last_name}" if p.student and p.student.user else None
    log_action(db, current_user, "update", "payments", "payment", p.id, label,
               details={"paid_amount": float(p.paid_amount), "status": p.status.value})
    db.commit()
    p = db.query(Payment).options(
        joinedload(Payment.student).joinedload(StudentProfile.user),
        joinedload(Payment.group),
    ).filter(Payment.id == payment_id).first()
    return _to_out(p)


@router.delete("/{payment_id}")
def delete_payment(
    payment_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(404, "To'lov topilmadi")
    _check_group_access(current_user, p.group_id, db)
    label = f"{p.student.user.first_name} {p.student.user.last_name}" if p.student and p.student.user else None
    log_action(db, current_user, "delete", "payments", "payment", p.id, label)
    db.delete(p)
    db.commit()
    return {"ok": True}
