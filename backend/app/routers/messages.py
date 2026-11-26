from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.message import Message, SenderType
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User, UserRole
from app.schemas.message import MessageCreate, MessageOut
from app.services.auth_service import get_current_user
from app.agent.agent_core import run_agent

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("/", response_model=List[MessageOut])
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(404, detail="Ticket not found")
    if current_user.role == UserRole.customer and ticket.customer_id != current_user.id:
        raise HTTPException(403, detail="Access denied")

    # staff replies go straight into the thread without triggering the AI bot
    if current_user.role in [UserRole.staff, UserRole.admin]:
        staff_msg = Message(
            ticket_id=payload.ticket_id,
            sender_type=SenderType.staff,
            sender_id=current_user.id,
            content=payload.content.strip()
        )
        db.add(staff_msg)
        if ticket.status == TicketStatus.open:
            ticket.status = TicketStatus.in_progress
        db.commit()
        db.refresh(staff_msg)
        return [staff_msg]

    # customer message -> save and invoke AI agent
    customer_msg = Message(
        ticket_id=payload.ticket_id,
        sender_type=SenderType.customer,
        sender_id=current_user.id,
        content=payload.content.strip()
    )
    db.add(customer_msg)
    db.flush()

    history_rows = db.query(Message).filter(
        Message.ticket_id == payload.ticket_id
    ).order_by(Message.created_at).all()

    history = [{"sender": m.sender_type.value, "content": m.content} for m in history_rows]

    reply = run_agent(
        user_message=payload.content,
        ticket_id=payload.ticket_id,
        customer_id=current_user.id,
        db=db,
        conversation_history=history
    )

    agent_msg = Message(
        ticket_id=payload.ticket_id,
        sender_type=SenderType.agent,
        sender_id=None,
        content=reply
    )
    db.add(agent_msg)
    db.commit()
    db.refresh(customer_msg)
    db.refresh(agent_msg)

    return [customer_msg, agent_msg]


@router.get("/ticket/{ticket_id}", response_model=List[MessageOut])
def get_conversation(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, detail="Ticket not found")
    if current_user.role == UserRole.customer and ticket.customer_id != current_user.id:
        raise HTTPException(403, detail="Access denied")

    return db.query(Message).filter(
        Message.ticket_id == ticket_id
    ).order_by(Message.created_at).all()
