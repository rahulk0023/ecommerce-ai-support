from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.refund import Refund
from app.models.order import Order
from app.models.user import User, UserRole
from app.schemas.refund import RefundCreate, RefundOut, RefundReview
from app.services.auth_service import get_current_user, require_staff
from app.services.refund_service import check_refund_eligibility, create_refund_record, review_refund
from app.services.escalation_service import create_escalation
from app.config import settings

router = APIRouter(prefix="/refunds", tags=["refunds"])


@router.post("/", response_model=RefundOut)
def request_refund(
    payload: RefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(404, detail="Order not found")
    if order.customer_id != current_user.id:
        raise HTTPException(403, detail="Access denied")

    # idempotency check before eligibility check so retries return the original record cleanly
    if payload.idempotency_key:
        existing = db.query(Refund).filter(
            Refund.idempotency_key == payload.idempotency_key,
            Refund.requested_by == current_user.id
        ).first()
        if existing:
            return existing

    check_refund_eligibility(order, payload.amount, db)

    refund = create_refund_record(
        db=db,
        order_id=payload.order_id,
        ticket_id=payload.ticket_id,
        amount=payload.amount,
        reason=payload.reason,
        requested_by=current_user.id,
        idempotency_key=payload.idempotency_key
    )

    # automatically create escalation if amount exceeds threshold and ticket is attached
    if payload.amount > settings.max_auto_refund_amount and payload.ticket_id is not None:
        create_escalation(
            db,
            payload.ticket_id,
            summary=f"High-value refund request: ₹{payload.amount} for order #{payload.order_id}. Reason: {payload.reason}",
            priority="high"
        )

    return refund


@router.get("/", response_model=List[RefundOut])
def list_refunds(
    ticket_id: Optional[int] = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Refund)
    if current_user.role == UserRole.customer:
        query = query.filter(Refund.requested_by == current_user.id)
    if ticket_id is not None:
        query = query.filter(Refund.ticket_id == ticket_id)
    if order_id is not None:
        query = query.filter(Refund.order_id == order_id)
    return query.order_by(Refund.created_at.desc()).all()


@router.get("/{refund_id}", response_model=RefundOut)
def get_refund(
    refund_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    refund = db.query(Refund).filter(Refund.id == refund_id).first()
    if not refund:
        raise HTTPException(404, detail="Refund not found")
    if current_user.role == UserRole.customer and refund.requested_by != current_user.id:
        raise HTTPException(403, detail="Access denied")
    return refund


@router.post("/{refund_id}/review", response_model=RefundOut)
def review_refund_request(
    refund_id: int,
    payload: RefundReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    return review_refund(db, refund_id, payload.decision, current_user.id)
