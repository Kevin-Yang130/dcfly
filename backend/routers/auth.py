from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token)
def register(body: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=body.email,
        hashed_password=auth_utils.hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"access_token": auth_utils.create_access_token(user.id), "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth_utils.verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"access_token": auth_utils.create_access_token(user.id), "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user
