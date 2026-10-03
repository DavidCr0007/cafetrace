import os
import secrets

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.batch import Batch
from app.models.product import Product
from app.models.traceability import TraceabilityRecord
from app.models.order import Order, OrderItem
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def seed_database():
    # Las tablas deben existir previamente mediante `alembic upgrade head`.
    db = SessionLocal()
    try:
        seed_admin_password = os.getenv("SEED_ADMIN_PASSWORD") or secrets.token_urlsafe(16)
        # 1. Crear usuario admin/productor si no existe
        admin = db.query(User).filter(User.email == "admin@cafetrace.io").first()
        if not admin:
            admin = User(
                email="admin@cafetrace.io",
                hashed_password=get_password_hash(seed_admin_password),
                full_name="Cooperativa Central del Huila",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"Usuario admin creado: admin@cafetrace.io / {seed_admin_password}")
        else:
            print("Usuario admin ya existía")

        # 2. Lote de Café Geisha
        coffee_batch = db.query(Batch).filter(Batch.id == 1).first()
        if not coffee_batch:
            coffee_batch = Batch(
                producer_id=admin.id,
                status="ready",
                details={
                    "origin": "Pitalito, Huila",
                    "farm": "Finca El Paraíso",
                    "altitude": 1850,
                    "variety": "Geisha",
                    "process": "Anaeróbico 48h con levaduras nativas",
                    "harvest_date": "2024-08-15",
                    "location": {"lat": 1.8543, "lng": -76.0512}
                }
            )
            db.add(coffee_batch)
            db.commit()
            db.refresh(coffee_batch)

        # Limpiar y regenerar registros de trazabilidad del café para que estén completos
        db.query(TraceabilityRecord).filter(TraceabilityRecord.batch_id == coffee_batch.id).delete()
        
        now = datetime.utcnow()
        t1 = TraceabilityRecord(
            batch_id=coffee_batch.id,
            record_type="iot",
            data={
                "stage": "Cosecha & Recepción",
                "sensor_id": "ESP32-HUILA-01",
                "temperature": 18.2,
                "humidity": 72.0,
                "brix_degrees": 24.5,
                "location": {"lat": 1.8543, "lng": -76.0512}
            },
            blockchain_hash="0x7f9a2b84c83e1850a582fae389d41c9b68ef5d89f74a01c3e8841a1290bb341",
            timestamp=now - timedelta(days=5)
        )
        t2 = TraceabilityRecord(
            batch_id=coffee_batch.id,
            record_type="iot",
            data={
                "stage": "Fermentación Anaeróbica Tanque 3",
                "sensor_id": "ESP32-HUILA-01",
                "temperature": 19.4,
                "humidity": 68.2,
                "ph": 4.1,
                "duration_hours": 48
            },
            blockchain_hash="0x3a48e71b29cc88a09df13c9e1284a55bc9007f31c890ab2238491c98fe31124",
            timestamp=now - timedelta(days=3)
        )
        t3 = TraceabilityRecord(
            batch_id=coffee_batch.id,
            record_type="blockchain_event",
            data={
                "stage": "Certificación SCA & Notarización",
                "evaluator": "Q-Grader Huila Specialty",
                "sca_score": 88.5,
                "polygon_tx": "0x5d92e88a70c3451203efbc12984abce912304910cf928a3498bfe123490aa18",
                "block_number": 12845029
            },
            blockchain_hash="0x5d92e88a70c3451203efbc12984abce912304910cf928a3498bfe123490aa18",
            timestamp=now - timedelta(days=1)
        )
        db.add_all([t1, t2, t3])

        # 3. Lote de Chorizo Campesino
        meat_batch = db.query(Batch).filter(Batch.id == 2).first()
        if not meat_batch:
            meat_batch = Batch(
                producer_id=admin.id,
                status="ready",
                details={
                    "origin": "Garzón, Huila",
                    "producer": "Agroindustria Florida",
                    "facility": "Planta de Procesamiento San Agustín",
                    "batch_code": "CH-2024-09",
                    "sanitary_license": "INVIMA-2023-00918",
                    "smoke_wood": "Leña de cafeto reciclada",
                    "location": {"lat": 2.1959, "lng": -75.6278}
                }
            )
            db.add(meat_batch)
            db.commit()
            db.refresh(meat_batch)

        db.query(TraceabilityRecord).filter(TraceabilityRecord.batch_id == meat_batch.id).delete()
        m1 = TraceabilityRecord(
            batch_id=meat_batch.id,
            record_type="iot",
            data={
                "stage": "Control de Cadena de Frío - Cuarto Frío",
                "sensor_id": "DS18B20-COLD-02",
                "temperature": 2.8,
                "humidity": 85.0,
                "status": "Optimo (Rango 2°C - 4°C)"
            },
            blockchain_hash="0x918bfca0239485101aefbc2938491823abce01928340192841029384bcda0192",
            timestamp=now - timedelta(days=2)
        )
        db.add(m1)

        # 4. Productos en Catálogo
        prod1 = db.query(Product).filter(Product.batch_id == coffee_batch.id).first()
        if not prod1:
            prod1 = Product(
                batch_id=coffee_batch.id,
                name="Café Geisha Huila - Edición Especial",
                description="Cultivado a 1,850 msnm con fermentación anaeróbica de 48 horas. Notas delicadas a jazmín, durazno maduro y miel silvestre.",
                price=180000.0,
                stock=50,
                attributes={
                    "category": "coffee",
                    "sca_score": 88.5,
                    "altitude": 1850,
                    "variety": "Geisha",
                    "process_method": "Anaeróbico 48h",
                    "cup_profile": ["Jazmín", "Durazno", "Miel silvestre", "Acidez cítrica brillante"]
                }
            )
            db.add(prod1)
        else:
            prod1.stock = 50
            prod1.attributes = {
                "category": "coffee",
                "sca_score": 88.5,
                "altitude": 1850,
                "variety": "Geisha",
                "process_method": "Anaeróbico 48h",
                "cup_profile": ["Jazmín", "Durazno", "Miel silvestre", "Acidez cítrica brillante"]
            }

        prod2 = db.query(Product).filter(Product.batch_id == meat_batch.id).first()
        if not prod2:
            prod2 = Product(
                batch_id=meat_batch.id,
                name="Chorizo Artesanal Campesino con Especias Andinas",
                description="Derivado cárnico prémium elaborado con cortes seleccionados de cerdo huilense, ahumado natural con leña de café.",
                price=38000.0,
                stock=40,
                attributes={
                    "category": "cured_meats",
                    "temperature_control": "2°C - 4°C",
                    "sanitary_registry": "RSA-0019283-2024",
                    "expiration_date": "30 días"
                }
            )
            db.add(prod2)
        else:
            prod2.stock = 40
            prod2.attributes = {
                "category": "cured_meats",
                "temperature_control": "2°C - 4°C",
                "sanitary_registry": "RSA-0019283-2024",
                "expiration_date": "30 días"
            }

        db.commit()
        db.refresh(prod1)
        db.refresh(prod2)

        # 5. Orden de prueba para validar el flujo transaccional
        sample_order = db.query(Order).first()
        if not sample_order:
            sample_order = Order(
                customer_name="Carlos Eduardo Mendoza",
                customer_email="carlos.mendoza@gmail.com",
                customer_phone="3158901234",
                shipping_address="Carrera 5 # 12-45, Barrio Los Pinos",
                city="Pitalito",
                department="Huila",
                total_amount=218000.0,
                status="confirmed",
                payment_method="contra_entrega",
                notes="Entregar en portería residencial",
                items=[
                    OrderItem(
                        product_id=prod1.id,
                        quantity=1,
                        unit_price=180000.0,
                        subtotal=180000.0
                    ),
                    OrderItem(
                        product_id=prod2.id,
                        quantity=1,
                        unit_price=38000.0,
                        subtotal=38000.0
                    )
                ]
            )
            db.add(sample_order)
            db.commit()
            print("Orden de prueba creada con éxito.")

        print("Base de datos sembrada y sincronizada exitosamente.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
