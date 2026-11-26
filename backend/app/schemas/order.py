from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date
from typing import Optional
from app.models.order import OrderStatus


class OrderCreate(BaseModel):
    total_amount: float = Field(..., gt=0, description="Order total in INR")
    item_category: str = Field(..., min_length=1, max_length=100)
    item_details: Optional[str] = Field(None, max_length=500)
    status: OrderStatus = OrderStatus.delivered
    delivery_date: Optional[date] = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    status: OrderStatus
    delivery_date: Optional[date] = None
    total_amount: float
    item_category: Optional[str] = None
    item_details: Optional[str] = None
    created_at: datetime
