from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.order import Order
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.schemas.ticket import TicketCreate, TicketOut, TicketStatusUpdate
from app.services.auth_service import get_current_user, require_staff

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("/", response_model=TicketOut)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # make sure a customer can't link someone else's order to their ticket
    if payload.order_id is not None:
        order = db.query(Order).filter(Order.id == payload.order_id).first()
        if not order:
            raise HTTPException(404, detail="Referenced order not found")
        if current_user.role == UserRole.customer and order.customer_id != current_user.id:
            raise HTTPException(403, detail="Cannot attach an order you do not own")

    ticket = Ticket(
        customer_id=current_user.id,
        order_id=payload.order_id,
        subject=payload.subject.strip(),
        description=payload.description.strip() if payload.description else None,
        category=payload.category
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/", response_model=List[TicketOut])
def list_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Ticket)

    # customers only see their own; staff see everything
    if current_user.role == UserRole.customer:
        query = query.filter(Ticket.customer_id == current_user.id)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Ticket.subject.ilike(term),
                Ticket.description.ilike(term)
            )
        )

    return query.order_by(Ticket.created_at.desc()).all()


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, detail="Ticket not found")
    if current_user.role == UserRole.customer and ticket.customer_id != current_user.id:
        raise HTTPException(403, detail="Access denied")
    return ticket


@router.patch("/{ticket_id}/status", response_model=TicketOut)
def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, detail="Ticket not found")

    if payload.status is not None:
        ticket.status = payload.status
    if payload.priority is not None:
        ticket.priority = payload.priority

    db.commit()
    db.refresh(ticket)
    return ticket
