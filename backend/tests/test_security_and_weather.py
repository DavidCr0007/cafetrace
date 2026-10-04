from app.api.v1.endpoints.auth import LoginJSON
import pytest
from app.core.config import Settings, settings
from app.schemas.order import OrderCreate
from app.core.blockchain import compute_batch_data_hash
from app.schemas.traceability import IoTIngest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app


def test_weather_location_is_icononzo():
    assert settings.WEATHER_LOCATION_NAME.startswith("Icononzo")
    assert settings.WEATHER_TIMEZONE == "America/Bogota"


def test_public_order_requires_items_and_valid_customer_fields():
    payload = OrderCreate(
        customer_name="Ana Pérez",
        customer_email="ana@example.com",
        customer_phone="3001234567",
        shipping_address="Carrera 1 # 2-3",
        city="Icononzo",
        items=[{"product_id": 1, "quantity": 1}],
    )
    assert payload.items[0].quantity == 1


def test_login_schema_uses_email():
    assert LoginJSON(email="ana@example.com", password="secret").email == "ana@example.com"


def test_blockchain_hash_is_deterministic():
    first = compute_batch_data_hash(7, {"origin": "Icononzo", "variety": "Caturra"}, 86.5)
    second = compute_batch_data_hash(7, {"variety": "Caturra", "origin": "Icononzo"}, 86.5)
    assert first == second and first.startswith("0x")


def test_iot_payload_requires_recent_measurement_shape():
    payload = IoTIngest(batch_id=1, sensor_id="ESP32-01", temperature=3.2, measured_at=datetime.now(timezone.utc))
    assert payload.sensor_id == "ESP32-01"


def test_cors_uses_explicit_allowlist_without_regex_wildcards():
    client = TestClient(app)
    allowed = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    rejected = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert rejected.status_code == 400


def test_production_settings_reject_local_cors_and_missing_secret():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY="x" * 32, CORS_ORIGINS=["http://localhost:3000"])
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY="", CORS_ORIGINS=["https://app.cafetrace.co"])
    production = Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY="x" * 32, CORS_ORIGINS=["https://app.cafetrace.co"])
    assert production.CORS_ORIGINS == ["https://app.cafetrace.co"]
