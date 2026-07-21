from typing import Optional
from app.models.audit import AuditLog


def log_action(
    db,
    user,
    action: str,
    module: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    entity_label: Optional[str] = None,
    details: Optional[dict] = None,
):
    """Audit yozuvini joriy tranzaksiyaga qo'shadi (commit chaqirmaydi)."""
    role_value = getattr(user.role, "value", user.role) if user else None
    db.add(AuditLog(
        user_id=user.id if user else None,
        user_name=f"{user.first_name} {user.last_name}" if user else None,
        role=role_value,
        action=action,
        module=module,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        details=details,
    ))
