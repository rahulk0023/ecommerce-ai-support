from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.services.auth_service import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, detail="Email already registered")

    usr = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password)
    )
    db.add(usr)
    db.commit()
    db.refresh(usr)
    return usr


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    usr = db.query(User).filter(User.email == payload.email).first()
    if not usr or not verify_password(payload.password, usr.password_hash):
        raise HTTPException(401, detail="Invalid email or password")

    token = create_token({"sub": str(usr.id), "role": usr.role.value})
    return {"access_token": token, "token_type": "bearer", "user": usr}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
