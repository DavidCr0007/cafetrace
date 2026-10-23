from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime, timezone

import pytest
import jwt

from app.modules.identity.permissions import Permission, ROLE_PERMISSIONS
from app.core.security import verify_password
from app.modules.traceability.models import Batch
from app.modules.accounting.models import OrderSettlement
from app.modules.orders.models import Order, OrderItem
from app.modules.catalog.models import Product
from app.modules.audit.models import AuditEvent
from app.modules.traceability.models import IoTDevice, TraceabilityRecord
from app.modules.identity.models import RefreshSession, User, UserRole
from app.core.config import settings
from tests.conftest import _headers, _user


def test_producer_cannot_read_another_producers_internal_batch_or_records(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer_a = _user(session, "producer-a@example.com", UserRole.PRODUCER)
    producer_b = _user(session, "producer-b@example.com", UserRole.PRODUCER)
    own_batch = Batch(product_type="coffee", producer_id=producer_a.id, status="harvested", details={"origin": "Icononzo"})
    other_batch = Batch(product_type="coffee", producer_id=producer_b.id, status="harvested", details={"origin": "Icononzo"})
    session.add_all([own_batch, other_batch])
    session.commit()
    own_id, other_id = own_batch.id, other_batch.id
    headers = _headers(producer_a)
    session.close()

    assert client.get(f"/api/v1/batches/{own_id}", headers=headers).status_code == 200
    assert client.get(f"/api/v1/batches/{other_id}", headers=headers).status_code == 404
    assert client.get(f"/api/v1/batches/{other_id}/records", headers=headers).status_code == 404
    listed = client.get("/api/v1/batches/", headers=headers)
    assert listed.status_code == 200
    assert [batch["id"] for batch in listed.json()] == [own_id]


def test_authentication_and_recovery_are_throttled(client_and_session):
    client, _ = client_and_session
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json={"email": "unknown@example.com", "password": "incorrect"}).status_code == 400
    login_limited = client.post("/api/v1/auth/login", json={"email": "unknown@example.com", "password": "incorrect"})
    assert login_limited.status_code == 429
    assert login_limited.headers["retry-after"]

    for _ in range(5):
        assert client.post("/api/v1/auth/password-reset/request", json={"email": "unknown@example.com"}).status_code == 200
    assert client.post("/api/v1/auth/password-reset/request", json={"email": "unknown@example.com"}).status_code == 429


def test_admin_can_create_and_edit_users_with_audit_trail(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    admin = _user(session, "admin@example.com", UserRole.ADMIN)
    session.commit()
    headers = _headers(admin)
    session.close()

    created = client.post(
        "/api/v1/admin/users",
        headers=headers,
        json={
            "email": "New.Seller@Example.com",
            "full_name": "Vendedor Inicial",
            "role": "seller",
            "password": "temporary-password-123",
            "is_active": True,
        },
    )

    assert created.status_code == 201
    user_id = created.json()["id"]
    assert created.json()["email"] == "new.seller@example.com"
    assert created.json()["role"] == "seller"
    assert "password" not in created.json()

    updated = client.patch(
        f"/api/v1/admin/users/{user_id}",
        headers=headers,
        json={"email": "seller.updated@example.com", "full_name": "Vendedor Actualizado", "role": "marketing", "is_active": False},
    )

    assert updated.status_code == 200
    assert updated.json()["email"] == "seller.updated@example.com"
    assert updated.json()["full_name"] == "Vendedor Actualizado"
    assert updated.json()["role"] == "marketing"
    assert updated.json()["is_active"] is False

    session = session_factory()
    stored = session.query(User).filter(User.id == user_id).one()
    assert verify_password("temporary-password-123", stored.hashed_password)
    assert session.query(AuditEvent).filter(AuditEvent.action == "user.created", AuditEvent.resource_id == str(user_id)).count() == 1
    assert session.query(AuditEvent).filter(AuditEvent.action == "user.access_updated", AuditEvent.resource_id == str(user_id)).count() == 1
    session.close()


def test_non_admin_cannot_create_users_and_duplicate_email_is_rejected(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    admin = _user(session, "admin-create@example.com", UserRole.ADMIN)
    auditor = _user(session, "auditor-create@example.com", UserRole.AUDITOR)
    session.commit()
    admin_headers = _headers(admin)
    auditor_headers = _headers(auditor)
    session.close()
    payload = {"email": "unique@example.com", "role": "buyer", "password": "temporary-password-123"}

    forbidden = client.post("/api/v1/admin/users", headers=auditor_headers, json=payload)
    first = client.post("/api/v1/admin/users", headers=admin_headers, json=payload)
    duplicate = client.post("/api/v1/admin/users", headers=admin_headers, json={**payload, "email": "UNIQUE@example.com"})
    legacy_role = client.post("/api/v1/admin/users", headers=admin_headers, json={**payload, "email": "legacy@example.com", "role": "customer"})
    forbidden_edit = client.patch(f"/api/v1/admin/users/{admin.id}", headers=auditor_headers, json={"full_name": "Cambio no permitido"})

    assert forbidden.status_code == 403
    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert legacy_role.status_code == 422
    assert forbidden_edit.status_code == 403


def test_admin_has_every_declared_module_and_cannot_remove_the_last_admin(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    admin = _user(session, "only-admin@example.com", UserRole.ADMIN)
    session.commit()
    headers = _headers(admin)
    admin_id = admin.id
    session.close()

    access = client.get("/api/v1/users/me/access", headers=headers)
    demote = client.patch(f"/api/v1/admin/users/{admin_id}", headers=headers, json={"role": "seller"})
    deactivate = client.patch(f"/api/v1/admin/users/{admin_id}", headers=headers, json={"is_active": False})

    assert access.status_code == 200
    assert set(access.json()["modules"]) == {permission.value for permission in Permission}
    assert demote.status_code == 422
    assert deactivate.status_code == 422


def test_settlement_is_idempotent_and_cancelled_orders_are_rejected(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    accountant = _user(session, "accountant@example.com", UserRole.ACCOUNTANT)
    producer = _user(session, "producer@example.com", UserRole.PRODUCER)
    batch = Batch(product_type="coffee", producer_id=producer.id, status="ready", details={})
    product = Product(batch=batch, name="Café", price=Decimal("10000.00"), stock=10, attributes={"category": "coffee", "direct_cost": "3500"})
    order = Order(customer_name="Cliente", customer_email="client@example.com", customer_phone="3000000000", shipping_address="Calle 1", city="Icononzo", total_amount=Decimal("10000.00"), status="confirmed", items=[OrderItem(product=product, quantity=1, unit_price=Decimal("10000.00"), subtotal=Decimal("10000.00"))])
    cancelled = Order(customer_name="Cancelado", customer_email="cancelled@example.com", customer_phone="3000000001", shipping_address="Calle 2", city="Icononzo", total_amount=Decimal("10000.00"), status="cancelled")
    session.add_all([batch, product, order, cancelled])
    session.commit()
    order_id, cancelled_id = order.id, cancelled.id
    headers = _headers(accountant)
    session.close()

    first = client.post(f"/api/v1/accounting/orders/{order_id}/settlement", headers=headers, json={"logistics_cost": "1000.00"})
    repeated = client.post(f"/api/v1/accounting/orders/{order_id}/settlement", headers=headers, json={"logistics_cost": "1000.00"})
    changed_cost = client.post(f"/api/v1/accounting/orders/{order_id}/settlement", headers=headers, json={"logistics_cost": "1200.00"})
    cancelled_response = client.post(f"/api/v1/accounting/orders/{cancelled_id}/settlement", headers=headers, json={"logistics_cost": "0"})

    assert first.status_code == 200
    assert repeated.status_code == 200
    assert repeated.json()["id"] == first.json()["id"]
    assert changed_cost.status_code == 409
    assert cancelled_response.status_code == 409

    session = session_factory()
    assert session.query(OrderSettlement).filter(OrderSettlement.order_id == order_id).count() == 1
    assert session.query(AuditEvent).filter(AuditEvent.action == "accounting.order_settlement_calculated").count() == 1
    session.close()


def test_concurrent_settlement_requests_create_one_record(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    accountant = _user(session, "concurrent-accountant@example.com", UserRole.ACCOUNTANT)
    producer = _user(session, "concurrent-producer@example.com", UserRole.PRODUCER)
    batch = Batch(product_type="coffee", producer_id=producer.id, status="ready", details={})
    product = Product(batch=batch, name="Café concurrente", price=Decimal("10000.00"), stock=10, attributes={"category": "coffee", "direct_cost": "3500"})
    order = Order(customer_name="Cliente", customer_email="concurrent@example.com", customer_phone="3000000002", shipping_address="Calle 3", city="Icononzo", total_amount=Decimal("10000.00"), status="confirmed", items=[OrderItem(product=product, quantity=1, unit_price=Decimal("10000.00"), subtotal=Decimal("10000.00"))])
    session.add_all([batch, product, order])
    session.commit()
    order_id = order.id
    headers = _headers(accountant)
    session.close()

    barrier = Barrier(2)

    def settle():
        barrier.wait()
        return client.post(f"/api/v1/accounting/orders/{order_id}/settlement", headers=headers, json={"logistics_cost": "1000.00"})

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda _: settle(), range(2)))

    assert [response.status_code for response in responses] == [200, 200]
    assert responses[0].json()["id"] == responses[1].json()["id"]
    session = session_factory()
    assert session.query(OrderSettlement).filter(OrderSettlement.order_id == order_id).count() == 1
    assert session.query(AuditEvent).filter(AuditEvent.action == "accounting.order_settlement_calculated").count() == 1
    session.close()


def test_access_token_lifetime_and_refresh_rotation_reuse_detection(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    user = _user(session, "refresh@example.com", UserRole.BUYER)
    session.commit()
    user_id = user.id
    session.close()

    login_response = client.post("/api/v1/auth/login", json={"email": "refresh@example.com", "password": "correct-horse-battery-staple"})
    assert login_response.status_code == 200
    assert "httponly" in login_response.headers["set-cookie"].lower()
    payload = jwt.decode(login_response.json()["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["type"] == "access"
    assert payload["exp"] - int(datetime.now(timezone.utc).timestamp()) <= 60 * 60
    original_refresh = client.cookies.get(settings.REFRESH_COOKIE_NAME)

    rotated = client.post("/api/v1/auth/refresh")
    assert rotated.status_code == 200
    replacement_refresh = client.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert replacement_refresh and replacement_refresh != original_refresh

    replay = client.post("/api/v1/auth/refresh", headers={"Cookie": f"{settings.REFRESH_COOKIE_NAME}={original_refresh}"})
    assert replay.status_code == 401
    session = session_factory()
    assert session.query(RefreshSession).filter(RefreshSession.user_id == user_id, RefreshSession.revoked_at.is_(None)).count() == 0
    assert session.query(AuditEvent).filter(AuditEvent.action == "auth.refresh_reuse_detected").count() == 1
    session.close()


@pytest.mark.parametrize("role", list(UserRole))
def test_role_permissions_match_representative_endpoints(client_and_session, role):
    client, session_factory = client_and_session
    session = session_factory()
    user = _user(session, f"matrix-{role.value}@example.com", role)
    session.commit()
    headers = _headers(user)
    session.close()
    checks = [
        ("/api/v1/admin/summary", Permission.DASHBOARD_SUMMARY_READ),
        ("/api/v1/users/", Permission.USERS_READ),
        ("/api/v1/accounting/summary", Permission.ACCOUNTING_READ),
        ("/api/v1/admin/audit-events", Permission.AUDIT_READ),
        ("/api/v1/orders/", Permission.ORDERS_READ),
        ("/api/v1/batches/", Permission.TRACEABILITY_READ),
    ]
    for path, permission in checks:
        response = client.get(path, headers=headers)
        expected = 200 if permission in ROLE_PERMISSIONS[role] else 403
        assert response.status_code == expected, (role.value, path, response.text)


def test_seller_catalog_and_order_scope_are_enforced(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer = _user(session, "scope-producer@example.com", UserRole.PRODUCER)
    seller = _user(session, "scope-seller@example.com", UserRole.SELLER)
    other_seller = _user(session, "scope-other-seller@example.com", UserRole.SELLER)
    assigned = Batch(product_type="coffee", producer_id=producer.id, seller_id=seller.id, status="ready", details={})
    unassigned = Batch(product_type="coffee", producer_id=producer.id, seller_id=other_seller.id, status="ready", details={})
    session.add_all([assigned, unassigned]); session.commit()
    assigned_id, unassigned_id = assigned.id, unassigned.id
    seller_headers = _headers(seller)
    session.close()

    created = client.post("/api/v1/products/", headers=seller_headers, json={"batch_id": assigned_id, "name": "Café vendedor", "price": "20000", "stock": 5})
    forbidden = client.post("/api/v1/products/", headers=seller_headers, json={"batch_id": unassigned_id, "name": "Café ajeno", "price": "20000", "stock": 5})
    assert created.status_code == 200
    assert created.json()["seller_id"] is not None
    assert forbidden.status_code == 403


def test_buyer_sees_only_owned_orders_and_payment_requires_ownership(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    buyer = _user(session, "buyer-owner@example.com", UserRole.BUYER)
    other = _user(session, "buyer-other@example.com", UserRole.BUYER)
    producer = _user(session, "buyer-producer@example.com", UserRole.PRODUCER)
    batch = Batch(product_type="coffee", producer_id=producer.id, status="ready", details={})
    product = Product(batch=batch, name="Café comprador", price=Decimal("10000.00"), stock=10, attributes={})
    own = Order(customer_user_id=buyer.id, customer_name="Propio", customer_email=buyer.email, customer_phone="3000000000", shipping_address="Calle 1", city="Icononzo", total_amount=Decimal("10000.00"), status="confirmed", items=[OrderItem(product=product, quantity=1, unit_price=Decimal("10000.00"), subtotal=Decimal("10000.00"))])
    foreign = Order(customer_user_id=other.id, customer_name="Ajeno", customer_email=other.email, customer_phone="3000000001", shipping_address="Calle 2", city="Icononzo", total_amount=Decimal("10000.00"), status="confirmed")
    session.add_all([batch, product, own, foreign]); session.commit()
    own_id, foreign_id = own.id, foreign.id
    headers = _headers(buyer)
    session.close()

    listed = client.get("/api/v1/orders/", headers=headers)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [own_id]
    assert client.post(f"/api/v1/operations/orders/{own_id}/payment-intents", headers=headers, json={"provider": "manual"}).status_code == 200
    assert client.post(f"/api/v1/operations/orders/{foreign_id}/payment-intents", headers=headers, json={"provider": "manual"}).status_code == 404
    assert client.post(f"/api/v1/operations/orders/{own_id}/payment-intents", json={"provider": "manual"}).status_code == 401


def test_iot_replay_is_idempotent(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer = _user(session, "iot-producer@example.com", UserRole.PRODUCER)
    batch = Batch(product_type="coffee", producer_id=producer.id, status="processing", details={})
    session.add(batch); session.flush()
    device = IoTDevice(device_id="ESP32-REPLAY", batch_id=batch.id, secret_hash=__import__("hashlib").sha256(b"device-token-with-24-characters").hexdigest())
    session.add(device); session.commit(); batch_id = batch.id; session.close()
    measured_at = datetime.now(timezone.utc).isoformat()
    payload = {"batch_id": batch_id, "sensor_id": "sensor-1", "temperature": 19.2, "measured_at": measured_at}
    headers = {"X-IoT-Device": "ESP32-REPLAY", "X-IoT-Token": "device-token-with-24-characters"}
    first = client.post("/api/v1/iot/ingest", headers=headers, json=payload)
    replay = client.post("/api/v1/iot/ingest", headers=headers, json=payload)
    assert first.status_code == 201
    assert replay.status_code == 200
    assert replay.json()["id"] == first.json()["id"]
    session = session_factory()
    assert session.query(TraceabilityRecord).count() == 1
    session.close()
