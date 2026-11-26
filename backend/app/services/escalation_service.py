from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.escalation import Escalation, EscalationPriority, EscalationDecision
from app.models.ticket import Ticket, TicketStatus
from app.models.refund import Refund, RefundStatus
from app.middleware.audit_logger import log_audit_event


def create_escalation(db: Session, ticket_id: int, summary: str, priority: str = "medium") -> Escalation:
    # idempotent — if already escalated just return the existing one
    existing = db.query(Escalation).filter(Escalation.ticket_id == ticket_id).first()
    if existing:
        return existing

    esc = Escalation(
        ticket_id=ticket_id,
        summary=summary,
        priority=EscalationPriority(priority)
    )
    db.add(esc)

    # update ticket status so staff can see it's waiting on them
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket:
        ticket.status = TicketStatus.pending_review

    db.commit()
    db.refresh(esc)
    log_audit_event("escalation_created", escalation_id=esc.id, ticket_id=ticket_id, priority=priority)
    return esc


def review_escalation(db: Session, escalation_id: int, decision: str, note: str, reviewer_id: int) -> Escalation:
    esc = db.query(Escalation).filter(Escalation.id == escalation_id).first()
    if not esc:
        raise HTTPException(404, detail="Escalation not found")

    esc.decision = EscalationDecision(decision)
    esc.internal_note = note
    esc.assigned_to = reviewer_id

    ticket = db.query(Ticket).filter(Ticket.id == esc.ticket_id).first()
    refunds = db.query(Refund).filter(Refund.ticket_id == esc.ticket_id).all()

    if decision == "approved":
        for rf in refunds:
            if rf.status in [RefundStatus.pending, RefundStatus.escalated]:
                rf.status = RefundStatus.approved
                rf.reviewed_by = reviewer_id
                log_audit_event("refund_approved", refund_id=rf.id, reviewed_by=reviewer_id)
        if ticket:
            ticket.status = TicketStatus.resolved
    elif decision == "rejected":
        for rf in refunds:
            if rf.status in [RefundStatus.pending, RefundStatus.escalated]:
                rf.status = RefundStatus.rejected
                rf.reviewed_by = reviewer_id
                log_audit_event("refund_rejected", refund_id=rf.id, reviewed_by=reviewer_id)
        if ticket:
            ticket.status = TicketStatus.closed
    elif decision == "needs_info":
        if ticket:
            ticket.status = TicketStatus.in_progress

    db.commit()
    db.refresh(esc)
    log_audit_event(
        "escalation_reviewed",
        escalation_id=esc.id,
        ticket_id=esc.ticket_id,
        decision=decision,
        reviewed_by=reviewer_id,
    )
    return esc
