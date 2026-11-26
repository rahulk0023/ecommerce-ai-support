from sqlalchemy.orm import Session
from datetime import date
from fastapi import HTTPException
from app.models.order import Order, OrderStatus
from app.models.refund import Refund, RefundStatus
from app.models.ticket import Ticket, TicketStatus
from app.config import settings
from app.middleware.audit_logger import log_audit_event
import logging

logger = logging.getLogger(__name__)


def check_refund_eligibility(order: Order, amount: float, db: Session):
    """
    Validates a refund before we do anything.
    Checks delivery status, return window, and amount cap.
    """
    if amount <= 0:
        raise HTTPException(400, detail="Refund amount must be greater than zero")

    if order.status not in [OrderStatus.delivered]:
        raise HTTPException(400, detail="Only delivered orders are eligible for refunds")

    if order.delivery_date is None:
        raise HTTPException(400, detail="Order has no delivery date recorded")

    today = date.today()
    days_since = (today - order.delivery_date).days

    if days_since > settings.return_window_days:
        raise HTTPException(
            400,
            detail=f"Return window expired. Orders must be returned within {settings.return_window_days} days of delivery."
        )

    if amount > order.total_amount:
        raise HTTPException(400, detail="Refund amount exceeds order total")

    # make sure there's no active refund for this order already
    existing = db.query(Refund).filter(
        Refund.order_id == order.id,
        Refund.status.notin_([RefundStatus.rejected])
    ).first()
    if existing:
        raise HTTPException(409, detail="A refund request already exists for this order")


def create_refund_record(
    db: Session,
    order_id: int,
    ticket_id,
    amount: float,
    reason: str,
    requested_by: int,
    idempotency_key: str = None
) -> Refund:
    # idempotency check — same key means same request, return existing
    if idempotency_key:
        existing = db.query(Refund).filter(Refund.idempotency_key == idempotency_key).first()
        if existing:
            log_audit_event("refund_duplicate_prevented", refund_id=existing.id, order_id=order_id)
            return existing

    # amounts above the threshold need a human to look at them;
    # eligible refunds within the threshold are auto-approved
    if amount > settings.max_auto_refund_amount:
        status = RefundStatus.escalated
    else:
        status = RefundStatus.approved

    refund = Refund(
        order_id=order_id,
        ticket_id=ticket_id,
        amount=amount,
        reason=reason,
        status=status,
        requested_by=requested_by,
        idempotency_key=idempotency_key
    )
    db.add(refund)
    db.commit()
    db.refresh(refund)

    log_audit_event(
        "refund_requested",
        refund_id=refund.id,
        order_id=order_id,
        amount=amount,
        status=status.value,
        requested_by=requested_by,
    )
    return refund


def review_refund(db: Session, refund_id: int, decision: str, reviewer_id: int) -> Refund:
    """Allow support staff to approve or reject a pending/escalated refund."""
    refund = db.query(Refund).filter(Refund.id == refund_id).first()
    if not refund:
        raise HTTPException(404, detail="Refund not found")

    if refund.status in [RefundStatus.approved, RefundStatus.rejected, RefundStatus.processed]:
        raise HTTPException(400, detail=f"Refund has already been {refund.status.value}")

    refund.status = RefundStatus.approved if decision == "approved" else RefundStatus.rejected
    refund.reviewed_by = reviewer_id

    if refund.ticket_id:
        ticket = db.query(Ticket).filter(Ticket.id == refund.ticket_id).first()
        if ticket and decision == "approved":
            ticket.status = TicketStatus.resolved

    db.commit()
    db.refresh(refund)

    log_audit_event(
        f"refund_{decision}",
        refund_id=refund.id,
        order_id=refund.order_id,
        reviewed_by=reviewer_id,
    )
    return refund
