from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.ticket import Ticket
from app.models.message import Message, SenderType
from app.services.auth_service import get_current_user
from app.agent.agent_core import run_agent, detect_injection
import logging

router = APIRouter(prefix="/agent", tags=["agent"])
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    ticket_id: int
    message: str


class ChatResponse(BaseModel):
    reply: str
    ticket_id: int


@router.post("/chat", response_model=ChatResponse)
def chat_with_agent(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(404, detail="Ticket not found")
    if ticket.customer_id != current_user.id:
        raise HTTPException(403, detail="Access denied")

    logger.info(f"Agent chat: ticket={payload.ticket_id}, customer={current_user.id}")

    # pull recent messages for context
    recent = db.query(Message).filter(
        Message.ticket_id == payload.ticket_id
    ).order_by(Message.created_at).limit(20).all()

    history = [{"sender": m.sender_type.value, "content": m.content} for m in recent]

    reply = run_agent(
        user_message=payload.message,
        ticket_id=payload.ticket_id,
        customer_id=current_user.id,
        db=db,
        conversation_history=history
    )

    # persist both messages
    db.add(Message(ticket_id=payload.ticket_id, sender_type=SenderType.customer, sender_id=current_user.id, content=payload.message))
    db.add(Message(ticket_id=payload.ticket_id, sender_type=SenderType.agent, sender_id=None, content=reply))
    db.commit()

    return {"reply": reply, "ticket_id": payload.ticket_id}
