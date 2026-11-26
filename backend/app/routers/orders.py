from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.order import Order
from app.models.user import User, UserRole
from app.schemas.order import OrderOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/", response_model=List[OrderOut])
def list_orders(
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.customer:
        return db.query(Order).filter(Order.customer_id == current_user.id).all()

    query = db.query(Order)
    if customer_id is not None:
        query = query.filter(Order.customer_id == customer_id)
    return query.order_by(Order.id).all()


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
