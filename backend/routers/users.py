from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/recently-seen", response_model=List[schemas.RecentlySeenResponse])
def get_recently_seen(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.RecentlySeen)
        .filter(models.RecentlySeen.user_id == current_user.id)
        .order_by(models.RecentlySeen.viewed_at.desc())
        .limit(10)
        .all()
    )


@router.post("/me/recently-seen", status_code=204)
def record_recently_seen(
    stock: schemas.StockEntry,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(models.RecentlySeen)
        .filter(
            models.RecentlySeen.user_id == current_user.id,
            models.RecentlySeen.symbol == stock.symbol,
        )
        .first()
    )
    if existing:
        existing.viewed_at = datetime.utcnow()
        existing.price = stock.price
        existing.name = stock.name
    else:
        db.add(
            models.RecentlySeen(
                user_id=current_user.id,
                symbol=stock.symbol,
                name=stock.name,
                price=stock.price,
            )
        )
    db.commit()


@router.get("/me/saved", response_model=List[schemas.SavedStockResponse])
def get_saved(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.SavedStock)
        .filter(models.SavedStock.user_id == current_user.id)
        .order_by(models.SavedStock.saved_at.desc())
        .all()
    )


@router.post("/me/saved/{symbol}", status_code=204)
def save_stock(
    symbol: str,
    stock: schemas.StockEntry,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_symbol = symbol.strip().upper()
    if normalized_symbol != stock.symbol:
        raise HTTPException(status_code=400, detail="Symbol in path and body must match")

    existing = (
        db.query(models.SavedStock)
        .filter(
            models.SavedStock.user_id == current_user.id,
            models.SavedStock.symbol == normalized_symbol,
        )
        .first()
    )
    if existing:
        existing.name = stock.name
    else:
        db.add(
            models.SavedStock(
                user_id=current_user.id,
                symbol=normalized_symbol,
                name=stock.name,
            )
        )
    db.commit()


@router.delete("/me/saved/{symbol}", status_code=204)
def unsave_stock(
    symbol: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_symbol = symbol.strip().upper()
    entry = (
        db.query(models.SavedStock)
        .filter(
            models.SavedStock.user_id == current_user.id,
            models.SavedStock.symbol == normalized_symbol,
        )
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Not in saved stocks")
    db.delete(entry)
    db.commit()
