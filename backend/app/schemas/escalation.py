from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from app.models.escalation import EscalationPriority, EscalationDecision


class EscalationCreate(BaseModel):
    ticket_id: int
    summary: str = Field(min_length=2)
    priority: EscalationPriority = EscalationPriority.medium


class EscalationReview(BaseModel):
    decision: EscalationDecision
    internal_note: Optional[str] = None


class EscalationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    summary: str
    priority: EscalationPriority
    assigned_to: Optional[int] = None
    decision: EscalationDecision
    internal_note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
