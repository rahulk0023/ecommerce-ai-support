"""
AI agent core logic.
Uses a mock LLM approach for local/offline testing — swap mock_llm_response()
with a real Gemini or OpenAI call if you have an API key.
"""
import re
import logging
from sqlalchemy.orm import Session
from app.agent.tools import get_order_details, search_return_policy, process_refund, escalate_to_human
from app.middleware.audit_logger import log_audit_event

logger = logging.getLogger(__name__)

# patterns that look like prompt injection
INJECTION_PATTERNS = [
    "ignore previous instructions",
    "ignore all previous",
    "disregard your instructions",
    "you are now",
    "pretend you are",
    "bypass your rules",
    "bypass policy",
    "override your",
    "override limit",
    "forget your instructions",
    "reveal your system prompt",
    "act as if you have no restrictions",
    "approve all refunds",
]


def detect_injection(text: str) -> bool:
    lower = text.lower()
    return any(pat in lower for pat in INJECTION_PATTERNS)


def run_agent(
    user_message: str,
    ticket_id: int,
    customer_id: int,
    db: Session,
    conversation_history: list = None
) -> str:
    """
    One turn of agent conversation.
    Returns the agent's reply as a plain string.
    """
    if detect_injection(user_message):
        log_audit_event("prompt_injection_blocked", ticket_id=ticket_id, customer_id=customer_id)
        logger.warning(f"Prompt injection attempt detected on ticket {ticket_id} by customer {customer_id}")
        return (
            "I'm sorry, but I can't process that request. "
            "If you need further help, I can connect you with a human agent."
        )

    history = conversation_history or []

    # build a short context string from recent messages
    context = ""
    if history:
        context = "\n".join([
            f"{'Customer' if m['sender'] == 'customer' else 'Agent'}: {m['content']}"
            for m in history[-6:]
        ])

    return mock_llm_response(user_message, context, ticket_id, customer_id, db, history)


def _pending_intent_from_history(history: list):
    """
    Check if the agent just asked the customer for an order ID in the last turn,
    so a short reply like '1' or '#1' continues the refund or order lookup flow.
    """
    if not history:
        return None

    last_agent_msg = None
    for m in reversed(history):
        if m.get("sender") == "agent":
            last_agent_msg = m.get("content", "").lower()
            break

    if not last_agent_msg or "order id" not in last_agent_msg:
        return None

    if "refund" in last_agent_msg:
        return "refund"
    if "check your order" in last_agent_msg:
        return "order_tracking"
    return None


def mock_llm_response(
    message: str,
    context: str,
    ticket_id: int,
    customer_id: int,
    db: Session,
    history: list = None
) -> str:
    """
    Rule-based routing that simulates an LLM deciding when to call tools.
    Replace this whole function with a real API call if you have a key available.
    """
    msg_lower = message.lower().strip()
    pending_intent = _pending_intent_from_history(history or [])

    # multi-turn follow-up: customer just replied with an order ID (e.g. "1" or "#3")
    if pending_intent and _extract_order_id(message, allow_short=True) is not None:
        order_id = _extract_order_id(message, allow_short=True)
        if pending_intent == "refund":
            return _handle_refund_intent(order_id, message, ticket_id, customer_id, db)
        if pending_intent == "order_tracking":
            result = get_order_details(order_id, customer_id, db)
            if "error" in result:
                return f"I couldn't find that order. {result['error']}. Please double-check the order ID."
            return _format_order_response(result)

    # return/refund policy questions
    if any(w in msg_lower for w in ["policy", "return rule", "refund rule", "how to return", "eligible", "can i return"]):
        category = "refund"
        if "electronics" in msg_lower:
            category = "electronics"
        elif "clothing" in msg_lower or "clothes" in msg_lower:
            category = "clothing"
        elif "food" in msg_lower:
            category = "food"

        result = search_return_policy(category)
        excerpt = result.get("policy_excerpt", "")
        return f"Here's what our return policy says:\n\n{excerpt}\n\nIs there anything specific about your order I can help you with?"

    # refund requests (checked before generic order tracking so "refund for order #1" routes here)
    if any(w in msg_lower for w in ["refund", "money back", "return my order", "want to return", "get my money"]):
        order_id = _extract_order_id(message)
        if not order_id:
            return "I can help with a refund. Could you please provide your order ID so I can check the details?"
        return _handle_refund_intent(order_id, message, ticket_id, customer_id, db)

    # order tracking
    if any(w in msg_lower for w in ["order status", "where is my order", "track", "order #", "order id", "my order"]):
        order_id = _extract_order_id(message)
        if not order_id:
            return "I'd be happy to check your order. Could you please share your order ID? It usually looks like a number (e.g., 1001)."

        result = get_order_details(order_id, customer_id, db)
        if "error" in result:
            return f"I couldn't find that order. {result['error']}. Please double-check the order ID."

        return _format_order_response(result)

    # human escalation request
    if any(w in msg_lower for w in ["human", "agent", "representative", "speak to someone", "escalate", "real person"]):
        ctx_snippet = context[-200:] if context else message
        result = escalate_to_human(
            ticket_id=ticket_id,
            summary=f"Customer requested human support. Context: {ctx_snippet}",
            priority="medium",
            db=db
        )
        return result.get("message", "I've connected you with our support team. Someone will be with you shortly.")

    # fallback
    return (
        "Thanks for reaching out! I can help you with order tracking, refund requests, and return policy questions. "
        "Could you tell me more about what you need? If you have an order ID handy, that'll speed things up."
    )


def _handle_refund_intent(order_id: int, message: str, ticket_id: int, customer_id: int, db: Session) -> str:
    order_info = get_order_details(order_id, customer_id, db)
    if "error" in order_info:
        return f"I couldn't locate that order. {order_info.get('error', '')}. Please check the order ID."

    amount = _extract_amount(message) or order_info.get("total_amount", 0)

    result = process_refund(
        order_id=order_id,
        amount=amount,
        reason=message,
        customer_id=customer_id,
        ticket_id=ticket_id,
        db=db
    )

    if "error" in result:
        return f"I wasn't able to process the refund: {result['error']}. Would you like me to escalate this to our support team?"

    return result.get("message", "Your refund request has been submitted.")


def _extract_order_id(text: str, allow_short: bool = False):
    patterns = [
        r'order\s*#?\s*(\d+)',
        r'#(\d+)',
        r'\border\s+id[:\s]+(\d+)',
        r'\b(\d{1,6})\b' if allow_short else r'\b(\d{3,6})\b',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return None


def _extract_amount(text: str):
    m = re.search(r'[₹rs\.]+\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:rupees?|inr)', text, re.IGNORECASE)
    if m:
        return float(m.group(1))
    return None


def _format_order_response(order_info: dict) -> str:
    status = order_info.get("status", "unknown")
    amount = order_info.get("total_amount", 0)
    delivery = order_info.get("delivery_date")
    category = order_info.get("item_category", "item")

    resp = f"Here are the details for Order #{order_info['order_id']}:\n"
    resp += f"• Status: {status.replace('_', ' ').title()}\n"
    resp += f"• Category: {category}\n"
    resp += f"• Amount: ₹{amount:.2f}\n"

    if delivery:
        resp += f"• Delivery Date: {delivery}\n"
        days = order_info.get("days_since_delivery")
        if days is not None:
            resp += f"• Delivered {days} day(s) ago\n"

    return resp
