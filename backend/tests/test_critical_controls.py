from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.rate_limit import auth_rate_limiter
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.batch import Batch
from app.models.operations import OrderSettlement
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.traceability import AuditEvent
from app.models.user import User, UserRole


@pytest.fixture
def client_and_session(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'critical-controls.db'}"
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    auth_rate_limiter.clear()
    with TestClient(app) as client:
        yield client, testing_session
    auth_rate_limiter.clear()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _user(session, email: str, role: UserRole) -> User:
    user = User(email=email, full_name=email, role=role, is_active=True, hashed_password=get_password_hash("correct-horse-battery-staple"))
    session.add(user)
    session.flush()
    return user


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def test_producer_cannot_read_another_producers_internal_batch_or_records(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    producer_a = _user(session, "producer-a@example.com", UserRole.PRODUCER)
    producer_b = _user(session, "producer-b@example.com", UserRole.PRODUCER)
    own_batch = Batch(producer_id=producer_a.id, status="harvested", details={"origin": "Icononzo"})
    other_batch = Batch(producer_id=producer_b.id, status="harvested", details={"origin": "Icononzo"})
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


def test_settlement_is_idempotent_and_cancelled_orders_are_rejected(client_and_session):
    client, session_factory = client_and_session
    session = session_factory()
    accountant = _user(session, "accountant@example.com", UserRole.ACCOUNTANT)
    producer = _user(session, "producer@example.com", UserRole.PRODUCER)
    batch = Batch(producer_id=producer.id, status="ready", details={})
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
    batch = Batch(producer_id=producer.id, status="ready", details={})
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
