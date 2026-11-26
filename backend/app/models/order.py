from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class OrderStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    returned = "returned"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, index=True)
    delivery_date = Column(Date, nullable=True)
    total_amount = Column(Float, nullable=False)
    item_category = Column(String(100))
    item_details = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("User", back_populates="orders")
    tickets = relationship("Ticket", back_populates="order")
    refunds = relationship("Refund", back_populates="order")
