from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.group import Group
from app.models.message import Message
from app.utils.auth import get_current_user, require_roles
from app.utils.messaging import deliver_to_parent

router = APIRouter(prefix="/api/messages", tags=["messages"])

StaffOnly = require_roles(UserRole.admin, UserRole.teacher)


class MessageCreate(BaseModel):
    recipient_user_id: Optional[int] = None
    recipient_student_id: Optional[int] = None
    body: str

    @model_validator(mode="after")
    def _one_recipient(self):
        if bool(self.recipient_user_id) == bool(self.recipient_student_id):
            raise ValueError("recipient_user_id yoki recipient_student_id — aynan bittasi ko'rsatilishi kerak")
        if not self.body.strip():
            raise ValueError("Xabar matni bo'sh bo'lishi mumkin emas")
        return self


class MessageOut(BaseModel):
    id: int
    sender_id: Optional[int]
    sender_name: Optional[str] = None
    recipient_user_id: Optional[int]
    recipient_student_id: Optional[int]
    channel: str
    body: str
    status: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


def _out(m: Message) -> MessageOut:
    sender_name = None
    if m.sender:
        sender_name = f"{m.sender.first_name} {m.sender.last_name}"
    elif m.sender_id is None and m.recipient_student_id is not None:
        sender_name = "Tizim"
    return MessageOut(
        id=m.id, sender_id=m.sender_id, sender_name=sender_name,
        recipient_user_id=m.recipient_user_id, recipient_student_id=m.recipient_student_id,
        channel=m.channel, body=m.body, status=m.status, is_read=m.is_read, created_at=m.created_at,
    )


def _check_student_access(user: User, student: StudentProfile, db: Session):
    if user.role == UserRole.teacher:
        if not student.group_id:
            raise HTTPException(403, "Bu o'quvchiga kirish ruxsati yo'q")
        owned = db.query(Group.id).filter(Group.id == student.group_id, Group.teacher_id == user.id).first()
        if not owned:
            raise HTTPException(403, "Bu o'quvchiga kirish ruxsati yo'q")


@router.post("", response_model=MessageOut)
def send_message(
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(StaffOnly),
):
    if body.recipient_user_id:
        recipient = db.query(User).filter(
            User.id == body.recipient_user_id,
            User.role.in_([UserRole.super_admin, UserRole.admin, UserRole.teacher]),
            User.is_active == True,
        ).first()
        if not recipient:
            raise HTTPException(404, "Qabul qiluvchi topilmadi")
        m = Message(
            sender_id=current_user.id, recipient_user_id=recipient.id,
            channel="internal", body=body.body.strip(), status="sent",
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        return _out(m)

    student = db.query(StudentProfile).filter(StudentProfile.id == body.recipient_student_id).first()
    if not student:
        raise HTTPException(404, "O'quvchi topilmadi")
    _check_student_access(current_user, student, db)

    channel, status = deliver_to_parent(student, body.body.strip())
    m = Message(
        sender_id=current_user.id, recipient_student_id=student.id,
        channel=channel, body=body.body.strip(), status=status,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _out(m)


@router.get("/inbox", response_model=List[MessageOut])
def inbox(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(StaffOnly),
):
    msgs = (
        db.query(Message)
        .filter(Message.recipient_user_id == current_user.id)
        .order_by(Message.created_at.desc())
        .offset(skip).limit(limit)
        .all()
    )
    return [_out(m) for m in msgs]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(StaffOnly),
):
    count = db.query(Message).filter(
        Message.recipient_user_id == current_user.id,
        Message.is_read == False,
    ).count()
    return {"count": count}


@router.put("/{message_id}/read")
def mark_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(StaffOnly),
):
    m = db.query(Message).filter(Message.id == message_id, Message.recipient_user_id == current_user.id).first()
    if not m:
        raise HTTPException(404, "Xabar topilmadi")
    m.is_read = True
    db.commit()
    return {"ok": True}


@router.get("/parent-log", response_model=List[MessageOut])
def parent_log(
    student_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(StaffOnly),
):
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not student:
        raise HTTPException(404, "O'quvchi topilmadi")
    _check_student_access(current_user, student, db)
    msgs = (
        db.query(Message)
        .filter(Message.recipient_student_id == student_id)
        .order_by(Message.created_at.desc())
        .limit(20)
        .all()
    )
    return [_out(m) for m in msgs]


@router.get("/recipients")
def recipients(
    db: Session = Depends(get_db),
    current_user: User = Depends(StaffOnly),
):
    users = db.query(User).filter(
        User.role.in_([UserRole.super_admin, UserRole.admin, UserRole.teacher]),
        User.is_active == True,
        User.id != current_user.id,
    ).order_by(User.last_name).all()
    return [
        {"id": u.id, "name": f"{u.first_name} {u.last_name}", "role": u.role.value if hasattr(u.role, "value") else u.role}
        for u in users
    ]
