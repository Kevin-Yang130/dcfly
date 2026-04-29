from fastapi import APIRouter, HTTPException, Query
from services.stock_service import search_stocks, get_stock_data

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/search")
def search(q: str = Query(..., min_length=1)):
    try:
        return search_stocks(q)
    except RuntimeError as e:
        if "rate_limited" in str(e):
            raise HTTPException(
                status_code=429,
                detail="Yahoo Finance rate limit reached. Please wait a moment and try again.",
            )
        raise HTTPException(status_code=502, detail="Search service unavailable")


@router.get("/{symbol}")
def get_stock(symbol: str):
    try:
        data = get_stock_data(symbol)
    except RuntimeError as e:
        if "rate_limited" in str(e):
            raise HTTPException(
                status_code=429,
                detail="Yahoo Finance rate limit reached. Please wait a moment and try again.",
            )
        raise HTTPException(status_code=502, detail="Stock data service unavailable")

    if data is None:
        raise HTTPException(status_code=404, detail=f"Stock '{symbol}' not found")
    return data
