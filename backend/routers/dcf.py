from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.dcf_service import calculate_dcf

router = APIRouter(prefix="/dcf", tags=["dcf"])


class DCFRequest(BaseModel):
    currentFCF: float = Field(..., description="Current annual free cash flow in dollars")
    growthRate: float = Field(..., description="FCF growth rate as a percentage, e.g. 10 for 10%")
    discountRate: float = Field(..., description="Discount rate as a percentage, e.g. 10 for 10%")
    terminalGrowthRate: float = Field(..., description="Terminal growth rate as a percentage, e.g. 3 for 3%")
    projectionYears: int = Field(..., ge=1, le=30)
    sharesOutstanding: float = Field(..., gt=0)


@router.post("/calculate")
def dcf_calculate(req: DCFRequest):
    if req.discountRate <= req.terminalGrowthRate:
        raise HTTPException(
            status_code=400,
            detail="Discount rate must be greater than terminal growth rate",
        )
    result = calculate_dcf(
        current_fcf=req.currentFCF,
        growth_rate=req.growthRate / 100,
        discount_rate=req.discountRate / 100,
        terminal_growth_rate=req.terminalGrowthRate / 100,
        projection_years=req.projectionYears,
        shares_outstanding=req.sharesOutstanding,
    )
    return result
