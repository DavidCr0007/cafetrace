from datetime import date, timedelta
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.blockchain.models import BlockchainNotarization
from app.modules.blockchain.service import compute_batch_data_hash, sca_to_contract_units
from app.modules.identity.models import UserRole
from app.modules.orders.models import Order
from app.modules.traceability.attributes import validate_attributes
from app.modules.traceability.models import Batch
from tests.conftest import _headers, _user

TODAY = date.today()


def coffee_details(**overrides):
    details = {
        "farm": "Finca La Esperanza",
        "altitude_masl": 1650,
        "variety": "Castillo",
        "harvest_started_on": (TODAY - timedelta(days=60)).isoformat(),
        "harvest_ended_on": (TODAY - timedelta(days=45)).isoformat(),
        "process": "washed",
        "drying_method": "parabolic_dryer",
        "drying_days": 18,
        "roast_level": "medium",
    }
    details.update(overrides)
    return details


def meat_details(**overrides):
    details = {
        "farm": "Hacienda El Recreo",
        "species": "bovine",
        "animal_age_months": 30,
        "feeding_type": "grass_fed",
        "refrigeration_type": "chilled",
        "storage_temp_min_c": 0,
        "storage_temp_max_c": 4,
        "slaughter_date": (TODAY - timedelta(days=3)).isoformat(),
    }
    details.update(overrides)
    return details


def test_coffee_attributes_are_normalized_with_icononzo_defaults():
    normalized = validate_attributes("coffee", coffee_details(sca_score=85.5))
    assert normalized["municipality"] == "Icononzo"
    assert normalized["department"] == "Tolima"
    assert normalized["sca_score"] == 85.5
    assert "roast_date" not in normalized


@pytest.mark.parametrize(
    "overrides",
    [
        {"unexpected_field": "x"},
        {"altitude_masl": 120},
        {"harvest_ended_on": (TODAY - timedelta(days=90)).isoformat()},
        {"harvest_ended_on": (TODAY + timedelta(days=5)).isoformat()},
        {"sca_score": 85.55},
        {"roast_level": "green", "roast_date": TODAY.isoformat()},
        {"drying_method": "oven"},
    ],
)
def test_invalid_coffee_attributes_are_rejected(overrides):
    with pytest.raises(ValidationError):
        validate_attributes("coffee", coffee_details(**overrides))


@pytest.mark.parametrize(
    "overrides",
    [
        {"storage_temp_min_c": 5, "storage_temp_max_c": 4},
        {"storage_temp_max_c": 8},
        {"refrigeration_type": "frozen", "storage_temp_min_c": -25, "storage_temp_max_c": -10},
        {"species": "ovine"},
        {"live_weight_kg": 300, "carcass_weight_kg": 350},
        {"altitude_masl": 1500},
    ],
)
def test_invalid_meat_attributes_are_rejected(overrides):
    with pytest.raises(ValidationError):
        validate_attributes("meat", meat_details(**overrides))


def test_frozen_meat_within_cold_chain_is_accepted():
    normalized = validate_attributes("meat", meat_details(refrigeration_type="frozen", storage_temp_min_c=-25, storage_temp_max_c=-18))
    assert normalized["refrigeration_type"] == "frozen"


def test_hash_depends_on_product_type_and_sca_uses_contract_scale():
    details = {"farm": "Finca", "municipality": "Icononzo"}
    assert compute_batch_data_hash(1, "coffee", details) != compute_batch_data_hash(1, "meat", details)
    assert sca_to_contract_units(88.5) == 885
    assert sca_to_contract_units(None) == 0


def test_producer_creates_typed_batches_and_mismatches_are_rejected(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer = _user(session, "typed-producer@example.com", UserRole.PRODUCER)
    session.commit()
    headers = _headers(producer)
    producer_id = producer.id
    session.close()

    coffee = client.post("/api/v1/batches/", headers=headers, json={"product_type": "coffee", "producer_id": producer_id, "details": coffee_details()})
    assert coffee.status_code == 200, coffee.text
    assert coffee.json()["product_type"] == "coffee"
    assert coffee.json()["details"]["municipality"] == "Icononzo"

    meat = client.post("/api/v1/batches/", headers=headers, json={"product_type": "meat", "producer_id": producer_id, "details": meat_details()})
    assert meat.status_code == 200, meat.text

    swapped = client.post("/api/v1/batches/", headers=headers, json={"product_type": "coffee", "producer_id": producer_id, "details": meat_details()})
    assert swapped.status_code == 422
    unknown_type = client.post("/api/v1/batches/", headers=headers, json={"product_type": "dairy", "producer_id": producer_id, "details": {}})
    assert unknown_type.status_code == 422

    listed = client.get("/api/v1/batches/?product_type=meat", headers=headers)
    assert [batch["product_type"] for batch in listed.json()] == ["meat"]


def test_batch_details_are_revalidated_on_update_and_frozen_after_notarization(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer = _user(session, "patch-producer@example.com", UserRole.PRODUCER)
    batch = Batch(product_type="coffee", producer_id=producer.id, status="harvested", details=validate_attributes("coffee", coffee_details()))
    session.add(batch)
    session.commit()
    batch_id, headers = batch.id, _headers(producer)
    session.close()

    invalid = client.patch(f"/api/v1/batches/{batch_id}", headers=headers, json={"details": meat_details()})
    assert invalid.status_code == 422
    assert invalid.json()["detail"][0]["loc"][:2] == ["body", "details"]

    valid = client.patch(f"/api/v1/batches/{batch_id}", headers=headers, json={"details": coffee_details(drying_days=20)})
    assert valid.status_code == 200
    assert valid.json()["details"]["drying_days"] == 20

    session = session_factory()
    session.add(BlockchainNotarization(batch_id=batch_id, data_hash="0x1", transaction_hash="0xabc", chain_id=80002, network="test", contract_address="0x0", status="confirmed"))
    session.commit()
    session.close()

    frozen = client.patch(f"/api/v1/batches/{batch_id}", headers=headers, json={"details": coffee_details(drying_days=25)})
    assert frozen.status_code == 409
    status_only = client.patch(f"/api/v1/batches/{batch_id}", headers=headers, json={"status": "ready"})
    assert status_only.status_code == 200


def test_public_timeline_exposes_typed_attributes_but_not_private_notes(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer = _user(session, "timeline-producer@example.com", UserRole.PRODUCER)
    details = validate_attributes("meat", meat_details(notes="Observación interna", ica_farm_registry="ICA-123"))
    batch = Batch(product_type="meat", producer_id=producer.id, status="ready", details=details)
    session.add(batch)
    session.commit()
    batch_id = batch.id
    session.close()

    timeline = client.get(f"/api/v1/batches/{batch_id}/timeline")
    assert timeline.status_code == 200
    body = timeline.json()
    assert body["product_type"] == "meat"
    assert body["origin"]["municipality"] == "Icononzo"
    assert body["attributes"]["refrigeration_type"] == "chilled"
    assert "notes" not in body["origin"] and "ica_farm_registry" not in body["attributes"]
    assert body["notarization"]["status"] == "not_notarized"


def test_producer_sells_directly_and_sees_only_own_orders(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer = _user(session, "direct-producer@example.com", UserRole.PRODUCER)
    other_producer = _user(session, "other-direct-producer@example.com", UserRole.PRODUCER)
    batch = Batch(product_type="coffee", producer_id=producer.id, status="ready", details={})
    session.add(batch)
    session.flush()
    foreign_order = Order(customer_name="Ajeno", customer_email="a@example.com", customer_phone="3000000000", shipping_address="Calle 1", city="Icononzo", total_amount=Decimal("1.00"), status="confirmed", seller_id=other_producer.id)
    session.add(foreign_order)
    session.commit()
    batch_id, foreign_id, producer_id = batch.id, foreign_order.id, producer.id
    other_id = other_producer.id
    headers = _headers(producer)
    session.close()

    product = client.post("/api/v1/products/", headers=headers, json={"batch_id": batch_id, "name": "Café directo", "price": "30000", "stock": 3})
    assert product.status_code == 200, product.text
    assert product.json()["seller_id"] == producer_id

    reassigned = client.patch(f"/api/v1/products/{product.json()['id']}", headers=headers, json={"seller_id": other_id})
    assert reassigned.status_code == 422

    order = client.post("/api/v1/orders/", json={
        "customer_name": "Cliente", "customer_email": "cliente@example.com", "customer_phone": "3000000001",
        "shipping_address": "Calle 2 # 3-4", "city": "Icononzo", "items": [{"product_id": product.json()["id"], "quantity": 1}],
    })
    assert order.status_code == 201
    assert order.json()["department"] == "Tolima"

    listed = client.get("/api/v1/orders/", headers=headers)
    assert [item["id"] for item in listed.json()] == [order.json()["id"]]
    assert client.get(f"/api/v1/orders/{foreign_id}", headers=headers).status_code == 404
    shipped = client.put(f"/api/v1/operations/orders/{order.json()['id']}/shipment", headers=headers, json={"status": "packed"})
    assert shipped.status_code == 200
    assert client.put(f"/api/v1/operations/orders/{foreign_id}/shipment", headers=headers, json={"status": "packed"}).status_code == 404
