# CaféTrace IA — Backend

API FastAPI para trazabilidad agrícola, comercio electrónico, RBAC, IoT, blockchain, logística y liquidaciones.

## Instalación

Desde `backend/`:

```bash
python -m venv ../.venv
source ../.venv/bin/activate       # Linux/macOS
..\.venv\Scripts\activate         # Windows PowerShell
pip install -r requirements.txt
test -f .env || cp .env.example .env
```

Configura `DATABASE_URL`, `SECRET_KEY`, CORS y, si aplica, las variables blockchain. PostgreSQL es obligatorio en todos los entornos operativos; SQLite no está soportado. Los flujos de login y recuperación se limitan por IP; ajusta `AUTH_RATE_LIMIT_ATTEMPTS` y `AUTH_RATE_LIMIT_WINDOW_SECONDS` según el entorno.

## Protocolo de arranque

Desde la raíz inicia primero la base local aislada:

```bash
./ops/dev-db.sh start
```

Después, desde `backend/`:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

La configuración de desarrollo usa `127.0.0.1:55432`. Comprueba la cadena
completa con `curl http://localhost:8000/health/ready`; un 200 confirma tanto
FastAPI como PostgreSQL. `GET /health` solo comprueba el proceso HTTP.

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

Los recursos internos de `/api/v1/batches` requieren sesión: productores solo
pueden consultar sus lotes; administración y auditoría pueden revisar el
conjunto. El pasaporte público se expone por `/batches/{id}/timeline`.

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
