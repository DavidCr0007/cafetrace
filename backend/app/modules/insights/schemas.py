from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict


class WeatherPoint(BaseModel):
    timestamp: datetime
    temperature_c: float | None = None
    relative_humidity_pct: float | None = None
    precipitation_probability_pct: float | None = None
    precipitation_mm: float | None = None
    wind_speed_kmh: float | None = None


class WeatherForecast(BaseModel):
    source: str
    location: str
    latitude: float
    longitude: float
    timezone: str
    generated_at: datetime
    forecast_days: int
    data_type: str = "weather_forecast"
    hourly: List[WeatherPoint]

    model_config = ConfigDict(from_attributes=True)
