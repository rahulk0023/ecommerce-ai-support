from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional
from app.models.order import OrderStatus


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
