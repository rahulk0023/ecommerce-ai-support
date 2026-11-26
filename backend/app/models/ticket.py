from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    pending_review = "pending_review"
    resolved = "resolved"
    closed = "closed"


class TicketCategory(str, enum.Enum):
    refund = "refund"
    shipping = "shipping"
    product = "product"
    payment = "payment"
    other = "other"


class TicketPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    subject = Column(String(300), nullable=False)
    description = Column(Text)
    category = Column(Enum(TicketCategory), default=TicketCategory.other)
    status = Column(Enum(TicketStatus), default=TicketStatus.open, index=True)
    priority = Column(Enum(TicketPriority), default=TicketPriority.medium, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("User", back_populates="tickets", foreign_keys=[customer_id])
    order = relationship("Order", back_populates="tickets")
    messages = relationship("Message", back_populates="ticket", order_by="Message.created_at")
    refund = relationship("Refund", back_populates="ticket", uselist=False)
    escalation = relationship("Escalation", back_populates="ticket", uselist=False)
