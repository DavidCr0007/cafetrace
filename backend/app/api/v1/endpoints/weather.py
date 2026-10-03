from fastapi import APIRouter, HTTPException, Query

from app.schemas.weather import WeatherForecast
from app.services.weather import get_icononzo_forecast

router = APIRouter()


@router.get("/forecast", response_model=WeatherForecast)
def read_icononzo_forecast(days: int = Query(default=7, ge=1, le=7)):
    """Pronóstico externo para contextualizar el monitoreo IoT de Icononzo."""
    try:
        return get_icononzo_forecast(days)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proveedor meteorológico no disponible: {exc}") from exc
