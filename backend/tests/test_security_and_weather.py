from app.api.v1.endpoints.auth import LoginJSON
from app.core.config import settings
from app.schemas.order import OrderCreate
from app.core.blockchain import compute_batch_data_hash
from app.schemas.traceability import IoTIngest
from datetime import datetime, timezone


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
