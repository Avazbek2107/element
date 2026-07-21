from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name    = Column(String(150), nullable=True)
    role         = Column(String(20), nullable=True)
    action       = Column(String(20), nullable=False)   # create | update | delete | permission_change
    module       = Column(String(30), nullable=False)
    entity_type  = Column(String(50), nullable=False)
    entity_id    = Column(Integer, nullable=True)
    entity_label = Column(String(255), nullable=True)
    details      = Column(JSON, nullable=True)
    created_at   = Column(DateTime, server_default=func.now())
