from sqlalchemy import Column, Integer, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class EscalationPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class EscalationDecision(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    needs_info = "needs_info"


class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, unique=True, index=True)
    summary = Column(Text, nullable=False)
    priority = Column(Enum(EscalationPriority), default=EscalationPriority.medium)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    decision = Column(Enum(EscalationDecision), default=EscalationDecision.pending, index=True)
    internal_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    ticket = relationship("Ticket", back_populates="escalation")
