from sqlalchemy.orm import Session
from datetime import date
from app.models.order import Order, OrderStatus
from app.services.refund_service import check_refund_eligibility, create_refund_record
from app.services.escalation_service import create_escalation
from app.services.policy_service import search_policy
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def get_order_details(order_id: int, customer_id: int, db: Session) -> dict:
    """
    Tool: fetch order info. Only returns data for the requesting customer's own orders.
    Hard rule — we never leak another customer's info.
    """
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        return {"error": "Order not found", "order_id": order_id}

    if order.customer_id != customer_id:
        logger.warning(f"Customer {customer_id} tried to access order {order_id} (belongs to {order.customer_id})")
        return {"error": "Order not found or access denied"}

    return {
        "order_id": order.id,
        "status": order.status.value,
        "delivery_date": str(order.delivery_date) if order.delivery_date else None,
        "total_amount": order.total_amount,
        "item_category": order.item_category,
        "item_details": order.item_details,
        "days_since_delivery": (date.today() - order.delivery_date).days if order.delivery_date else None
    }


def search_return_policy(category: str) -> dict:
    """Tool: keyword search over return_policy.txt"""
    result = search_policy(category)
    return {"policy_excerpt": result, "category": category}


def process_refund(
    order_id: int,
    amount: float,
    reason: str,
    customer_id: int,
    ticket_id: int,
    db: Session,
    idempotency_key: str = None
) -> dict:
    """
    Tool: process a refund. Backend handles all validation — the agent just calls this.
    We decide if it's valid, not the LLM.
    """
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        return {"error": "Order not found"}

    if order.customer_id != customer_id:
        return {"error": "Access denied"}

    try:
        check_refund_eligibility(order, amount, db)
    except Exception as e:
        detail = e.detail if hasattr(e, "detail") else str(e)
        return {"error": detail}

    # above threshold — record as escalated refund + create human escalation
    if amount > settings.max_auto_refund_amount:
        refund = create_refund_record(db, order_id, ticket_id, amount, reason, customer_id, idempotency_key)
        esc = create_escalation(
            db, ticket_id,
            summary=f"High-value refund request: ₹{amount} for order #{order_id}. Reason: {reason}",
            priority="high"
        )
        return {
            "status": "escalated",
            "refund_id": refund.id,
            "message": f"Refund of ₹{amount} exceeds the auto-approval limit. Your case has been escalated to our support team.",
            "escalation_id": esc.id
        }

    refund = create_refund_record(db, order_id, ticket_id, amount, reason, customer_id, idempotency_key)
    return {
        "status": "success",
        "refund_id": refund.id,
        "amount": refund.amount,
        "refund_status": refund.status.value,
        "message": f"Refund of ₹{amount} has been initiated. You'll see it in 3-5 business days."
    }


def escalate_to_human(ticket_id: int, summary: str, priority: str, db: Session) -> dict:
    """Tool: explicitly escalate a ticket to a human agent."""
    try:
        esc = create_escalation(db, ticket_id, summary, priority)
        return {
            "status": "escalated",
            "escalation_id": esc.id,
            "message": "Your case has been escalated to a support agent who will review it shortly."
        }
    except Exception as e:
        logger.error(f"Escalation failed for ticket {ticket_id}: {e}")
        return {"error": "Failed to escalate. Please try again."}
