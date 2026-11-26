from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from app.models.message import SenderType


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    ticket_id: int


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    sender_type: SenderType
    sender_id: Optional[int] = None
    content: str
    created_at: datetime
