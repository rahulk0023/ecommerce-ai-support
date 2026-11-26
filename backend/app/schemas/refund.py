from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, Literal
from app.models.refund import RefundStatus


class RefundCreate(BaseModel):
    order_id: int
    ticket_id: Optional[int] = None
    amount: float = Field(gt=0)
    reason: str = Field(min_length=2, max_length=1000)
    idempotency_key: Optional[str] = None


class RefundReview(BaseModel):
    decision: Literal["approved", "rejected"]
    note: Optional[str] = None


class RefundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    ticket_id: Optional[int] = None
    amount: float
    reason: Optional[str] = None
    status: RefundStatus
    requested_by: int
    reviewed_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
