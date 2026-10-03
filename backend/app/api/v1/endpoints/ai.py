from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.quality_ai import predict_quality

router = APIRouter()


class QualityInput(BaseModel):
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    sca_score: Optional[float] = None


@router.post("/quality-prediction")
def quality_prediction(payload: QualityInput):
    return predict_quality(payload.temperature_c, payload.humidity_pct, payload.sca_score)
