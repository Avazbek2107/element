from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.utils.auth import require_roles

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])

SuperAdminOnly = require_roles(UserRole.super_admin)


class AuditLogOut(BaseModel):
    id:           int
    user_id:      Optional[int]
    user_name:    Optional[str]
    role:         Optional[str]
    action:       str
    module:       str
    entity_type:  str
    entity_id:    Optional[int]
    entity_label: Optional[str]
    details:      Optional[dict]
    created_at:   datetime

    model_config = {"from_attributes": True}


class AuditLogPage(BaseModel):
    items: list[AuditLogOut]
    total: int


@router.get("", response_model=AuditLogPage)
def list_audit_logs(
    module:  Optional[str] = Query(None),
    action:  Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    skip:    int = Query(0, ge=0),
    limit:   int = Query(50, ge=1, le=200),
    db:      Session = Depends(get_db),
    _:       User = Depends(SuperAdminOnly),
):
    q = db.query(AuditLog)
    if module:
        q = q.filter(AuditLog.module == module)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    total = q.count()
    items = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}
