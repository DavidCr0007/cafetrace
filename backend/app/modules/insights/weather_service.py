from datetime import datetime, timezone
from typing import Any
import httpx

from app.core.config import settings


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
HOURLY_VARIABLES = (
    "temperature_2m,relative_humidity_2m,precipitation_probability,"
    "precipitation,wind_speed_10m"
)
_cache: tuple[float, int, dict[str, Any]] | None = None


def get_icononzo_forecast(days: int | None = None) -> dict[str, Any]:
    global _cache
    forecast_days = max(1, min(days or settings.WEATHER_FORECAST_DAYS, 7))
    now = datetime.now(timezone.utc).timestamp()
    if _cache and _cache[0] > now and _cache[1] == forecast_days:
        return _cache[2]
    params = {
        "latitude": settings.WEATHER_LATITUDE,
        "longitude": settings.WEATHER_LONGITUDE,
        "hourly": HOURLY_VARIABLES,
        "forecast_days": forecast_days,
        "timezone": settings.WEATHER_TIMEZONE,
    }
    with httpx.Client(timeout=10.0) as client:
        response = client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    hourly = payload.get("hourly", {})
    times = hourly.get("time", [])
    values = []
    for index, value in enumerate(times):
        values.append({
            "timestamp": value,
            "temperature_c": _at(hourly, "temperature_2m", index),
            "relative_humidity_pct": _at(hourly, "relative_humidity_2m", index),
            "precipitation_probability_pct": _at(hourly, "precipitation_probability", index),
            "precipitation_mm": _at(hourly, "precipitation", index),
            "wind_speed_kmh": _at(hourly, "wind_speed_10m", index),
        })

    result = {
        "source": settings.WEATHER_PROVIDER,
        "location": settings.WEATHER_LOCATION_NAME,
        "latitude": settings.WEATHER_LATITUDE,
        "longitude": settings.WEATHER_LONGITUDE,
        "timezone": payload.get("timezone", settings.WEATHER_TIMEZONE),
        "generated_at": datetime.now(timezone.utc),
        "forecast_days": forecast_days,
        "hourly": values,
    }
    _cache = (now + settings.WEATHER_CACHE_SECONDS, forecast_days, result)
    return result


def _at(data: dict[str, list[Any]], key: str, index: int) -> Any:
    values = data.get(key, [])
    return values[index] if index < len(values) else None
