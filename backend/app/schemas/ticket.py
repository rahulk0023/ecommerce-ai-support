from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from app.models.ticket import TicketStatus, TicketCategory, TicketPriority


class TicketCreate(BaseModel):
    subject: str = Field(min_length=2, max_length=300)
    description: Optional[str] = None
    category: TicketCategory = TicketCategory.other
    order_id: Optional[int] = None


class TicketStatusUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    order_id: Optional[int] = None
    subject: str
    description: Optional[str] = None
    category: TicketCategory
    status: TicketStatus
    priority: TicketPriority
    created_at: datetime
    updated_at: Optional[datetime] = None
