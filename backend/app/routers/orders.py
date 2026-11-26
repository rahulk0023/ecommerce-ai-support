import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderOut
from app.services.auth_service import get_current_user
from app.middleware.audit_logger import log_audit_event

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allow an authenticated user to add an order to their account."""
    details_val = payload.item_details.strip() if payload.item_details else None
    if details_val and not details_val.startswith("{"):
        details_val = json.dumps({"name": details_val})

    delivery = payload.delivery_date
    if payload.status == OrderStatus.delivered and delivery is None:
        delivery = date.today()

    order = Order(
        customer_id=current_user.id,
        status=payload.status,
        delivery_date=delivery,
        total_amount=payload.total_amount,
        item_category=payload.item_category.strip(),
        item_details=details_val,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    log_audit_event("order_created", order_id=order.id, customer_id=current_user.id, total_amount=order.total_amount)
    return order


@router.get("/", response_model=List[OrderOut])
def list_orders(
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.customer:
        return db.query(Order).filter(Order.customer_id == current_user.id).order_by(Order.id.desc()).all()

    query = db.query(Order)
    if customer_id is not None:
        query = query.filter(Order.customer_id == customer_id)
    return query.order_by(Order.id.desc()).all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, detail="Order not found")
    if current_user.role == UserRole.customer and order.customer_id != current_user.id:
        raise HTTPException(403, detail="Access denied")
    return order
