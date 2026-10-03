# CaféTrace IA — Backend

API FastAPI para trazabilidad agrícola, comercio electrónico, RBAC, IoT, blockchain, logística y liquidaciones.

## Instalación

Desde `backend/`:

```bash
python -m venv ../.venv
source ../.venv/bin/activate       # Linux/macOS
..\.venv\Scripts\activate         # Windows PowerShell
pip install -r requirements.txt
cp .env.example .env
```

Configura `DATABASE_URL`, `SECRET_KEY`, CORS y, si aplica, las variables blockchain. SQLite sirve para desarrollo; PostgreSQL es el destino de integración/producción.

## Protocolo de arranque

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

El backend no crea tablas automáticamente. El seed es demo y debe ejecutarse solo con datos no productivos:

```bash
python -m scripts.seed
```

## Rutas base

- `GET /health` y `GET /health/ready`.
- `GET /docs` y `GET /openapi.json`.
- `/api/v1/auth`: login, registro y recuperación de contraseña.
- `/api/v1/users`: perfil, permisos efectivos y usuarios autorizados.
- `/api/v1/admin`: resumen, matriz de acceso, auditoría y gestión de cuentas.
- `/api/v1/batches`: lotes, trazabilidad, notarización y verificación.
- `/api/v1/iot`: dispositivos e ingestión autenticada.
- `/api/v1/orders`: pedidos y estados.
- `/api/v1/operations`: pagos manuales y logística.
- `/api/v1/accounting`: reglas, liquidaciones, margen, salarios y nómina preliminar.
- `/api/v1/weather`: pronóstico de Icononzo, Tolima.
- `/api/v1/ai`: baseline explicable de calidad.

## Migraciones y pruebas

```bash
alembic upgrade head
alembic check
pytest -q
```

Para crear una revisión:

```bash
alembic revision --autogenerate -m "descripcion"
```

Nunca edites una migración ya aplicada en un entorno compartido; crea una nueva revisión.
