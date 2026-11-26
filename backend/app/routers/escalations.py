from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.escalation import Escalation
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.schemas.escalation import EscalationCreate, EscalationOut, EscalationReview
from app.services.auth_service import get_current_user, require_staff
from app.services.escalation_service import create_escalation, review_escalation

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.post("/", response_model=EscalationOut)
def create_esc(
    payload: EscalationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(404, detail="Ticket not found")
    if current_user.role == UserRole.customer and ticket.customer_id != current_user.id:
        raise HTTPException(403, detail="Access denied")
    return create_escalation(db, payload.ticket_id, payload.summary, payload.priority.value)


@router.get("/", response_model=List[EscalationOut])
def list_escalations(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff)
):
    return db.query(Escalation).order_by(Escalation.created_at.desc()).all()


@router.get("/{esc_id}", response_model=EscalationOut)
def get_escalation(
    esc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff)
):
    esc = db.query(Escalation).filter(Escalation.id == esc_id).first()
    if not esc:
        raise HTTPException(404, detail="Escalation not found")
    return esc


@router.post("/{esc_id}/review", response_model=EscalationOut)
def review_esc(
    esc_id: int,
    payload: EscalationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    return review_escalation(db, esc_id, payload.decision.value, payload.internal_note or "", current_user.id)
