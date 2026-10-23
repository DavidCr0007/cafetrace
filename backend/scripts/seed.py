import os
import secrets

from app.core.database import SessionLocal
import app.modules.registry  # noqa: F401 - resuelve relaciones entre módulos
from app.modules.identity.models import User, UserRole
from app.modules.traceability.attributes import validate_attributes
from app.modules.traceability.models import Batch, ProductType, TraceabilityRecord
from app.modules.catalog.models import Product
from app.modules.orders.models import Order, OrderItem
from app.core.security import get_password_hash
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from app.core.config import settings
from sqlalchemy import text

ICONONZO = {"lat": settings.WEATHER_LATITUDE, "lng": settings.WEATHER_LONGITUDE}


def _sync_batch(db, batch_id: int, product_type: ProductType, details: dict, producer: User, seller: User | None) -> Batch:
    # Se valida igual que la API para que los datos demo cumplan el esquema tipado.
    normalized = validate_attributes(product_type, details)
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        batch = Batch(id=batch_id, product_type=product_type.value, status="ready")
        db.add(batch)
    batch.product_type = product_type.value
    batch.producer_id = producer.id
    batch.seller_id = seller.id if seller else None
    batch.details = normalized
    db.flush()
    return batch


def _sync_product(db, batch: Batch, seller: User, values: dict) -> Product:
    product = db.query(Product).filter(Product.batch_id == batch.id).first()
    if not product:
        product = Product(batch_id=batch.id)
        db.add(product)
    product.seller_id = seller.id
    for key, value in values.items():
        setattr(product, key, value)
    db.flush()
    return product


def seed_database():
    if settings.ENVIRONMENT == "production":
        raise RuntimeError("El seed de demostración está bloqueado en producción")
    # Las tablas deben existir previamente mediante `alembic upgrade head`.
    db = SessionLocal()
    try:
        seed_admin_password = os.getenv("SEED_ADMIN_PASSWORD") or secrets.token_urlsafe(16)
        # 1. Crear administrador y perfiles demo si no existen
        admin = db.query(User).filter(User.email == "admin@cafetrace.io").first()
        if not admin:
            admin = User(
                email="admin@cafetrace.io",
                hashed_password=get_password_hash(seed_admin_password),
                full_name="Administración CaféTrace Icononzo",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"Usuario admin creado: admin@cafetrace.io / {seed_admin_password}")
        else:
            print("Usuario admin ya existía")

        demo_password = os.getenv("SEED_DEMO_PASSWORD") or secrets.token_urlsafe(16)
        if len(demo_password) < 12:
            raise RuntimeError("SEED_DEMO_PASSWORD debe contener al menos 12 caracteres")
        demo_users = {}
        for role in (UserRole.ACCOUNTANT, UserRole.SELLER, UserRole.PRODUCER, UserRole.MARKETING, UserRole.BUYER, UserRole.AUDITOR):
            email = f"{role.value}@cafetrace.io"
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(email=email, hashed_password=get_password_hash(demo_password), full_name=f"Perfil demo {role.value}", role=role, is_active=True)
                db.add(user)
                db.flush()
            demo_users[role] = user
        db.commit()
        print(f"Usuarios demo sincronizados. Contraseña temporal de esta ejecución: {demo_password}")

        producer = demo_users[UserRole.PRODUCER]
        seller = demo_users[UserRole.SELLER]
        today = date.today()

        # 2. Lote de café de altura de Icononzo
        coffee_batch = _sync_batch(db, 1, ProductType.COFFEE, {
            "farm": "Finca La Esperanza",
            "vereda": "Vereda Mundo Nuevo",
            "coordinates": ICONONZO,
            "altitude_masl": 1650,
            "variety": "Castillo",
            "harvest_started_on": (today - timedelta(days=75)).isoformat(),
            "harvest_ended_on": (today - timedelta(days=60)).isoformat(),
            "process": "washed",
            "fermentation_hours": 36,
            "drying_method": "parabolic_dryer",
            "drying_days": 18,
            "moisture_pct": 11.2,
            "roast_level": "medium",
            "roast_date": (today - timedelta(days=10)).isoformat(),
            "sca_score": 85.5,
            "cup_notes": ["Panela", "Mandarina", "Chocolate amargo"],
        }, producer, seller)

        # 3. Lote cárnico bovino de pastoreo; lo vende directamente el productor.
        meat_batch = _sync_batch(db, 2, ProductType.MEAT, {
            "farm": "Hacienda El Recreo",
            "vereda": "Vereda Balconcitos",
            "coordinates": ICONONZO,
            "species": "bovine",
            "breed": "Cebú x Normando",
            "animal_age_months": 30,
            "feeding_type": "grass_fed",
            "live_weight_kg": 480,
            "refrigeration_type": "vacuum_chilled",
            "storage_temp_min_c": 0,
            "storage_temp_max_c": 4,
            "slaughter_date": (today - timedelta(days=4)).isoformat(),
            "slaughterhouse": "Planta de beneficio autorizada (demo)",
            "withdrawal_period_respected": True,
            "cut": "Lomo fino",
        }, producer, None)
        db.commit()

        # Registros IoT demo regenerados en cada ejecución. No se crean eventos de
        # blockchain simulados: la notarización solo existe si se ejecuta de verdad.
        now = datetime.now(timezone.utc)
        db.query(TraceabilityRecord).filter(TraceabilityRecord.batch_id.in_([coffee_batch.id, meat_batch.id])).delete(synchronize_session=False)
        db.add_all([
            TraceabilityRecord(batch_id=coffee_batch.id, record_type="iot", timestamp=now - timedelta(days=62), data={
                "stage": "Fermentación", "sensor_id": "ESP32-ICONONZO-01", "temperature": 19.4, "humidity": 68.2, "location": ICONONZO,
            }),
            TraceabilityRecord(batch_id=coffee_batch.id, record_type="iot", timestamp=now - timedelta(days=50), data={
                "stage": "Secado en marquesina", "sensor_id": "ESP32-ICONONZO-01", "temperature": 27.1, "humidity": 55.0, "location": ICONONZO,
            }),
            TraceabilityRecord(batch_id=meat_batch.id, record_type="iot", timestamp=now - timedelta(days=2), data={
                "stage": "Cuarto frío", "sensor_id": "DS18B20-COLD-02", "temperature": 2.8, "humidity": 85.0, "location": ICONONZO,
            }),
        ])

        # 4. Productos en catálogo
        prod1 = _sync_product(db, coffee_batch, seller, {
            "name": "Café de altura Icononzo - Castillo lavado",
            "description": "Cultivado a 1.650 msnm en Icononzo, Tolima. Secado en marquesina durante 18 días. Notas a panela, mandarina y chocolate amargo.",
            "price": Decimal("42000.00"),
            "stock": 50,
            "attributes": {"category": "coffee", "presentation": "500 g grano tostado"},
        })
        prod2 = _sync_product(db, meat_batch, producer, {
            "name": "Lomo fino de res de pastoreo",
            "description": "Res criada en pastoreo en Icononzo, Tolima. Empacado al vacío y conservado entre 0 °C y 4 °C.",
            "price": Decimal("38000.00"),
            "stock": 40,
            "attributes": {"category": "meat", "presentation": "Paquete 500 g al vacío"},
        })
        db.commit()

        # 5. Orden de prueba para validar el flujo transaccional
        sample_order = db.query(Order).first()
        if not sample_order:
            sample_order = Order(
                customer_name="Comprador Demo",
                customer_email="buyer@cafetrace.io",
                customer_phone="3000000000",
                shipping_address="Calle 5 # 3-20, Barrio Centro",
                city="Icononzo",
                department="Tolima",
                total_amount=Decimal("42000.00"),
                status="confirmed",
                customer_user_id=demo_users[UserRole.BUYER].id,
                seller_id=seller.id,
                payment_method="contra_entrega",
                notes="Pedido demo",
                items=[OrderItem(product_id=prod1.id, quantity=1, unit_price=Decimal("42000.00"), subtotal=Decimal("42000.00"))],
            )
            db.add(sample_order)
            db.commit()
            print("Orden de prueba creada con éxito.")

        # Los IDs fijos de los lotes demo no avanzan la secuencia; se sincroniza para evitar colisiones.
        db.execute(text("SELECT setval(pg_get_serial_sequence('batches', 'id'), GREATEST((SELECT MAX(id) FROM batches), 1))"))
        db.commit()
        print("Base de datos sembrada y sincronizada exitosamente.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
