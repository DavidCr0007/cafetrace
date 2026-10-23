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

## Estructura por módulos

El código vive en `app/modules/`, un paquete por dominio, cada uno con sus
`models.py`, `schemas.py`, `service.py` y routers:

| Módulo | Contenido |
|---|---|
| `identity` | Usuarios, sesiones, autenticación, permisos y administración de cuentas |
| `audit` | Eventos de auditoría y vistas de supervisión |
| `traceability` | Lotes tipados, registros de trazabilidad e IoT |
| `blockchain` | Hash, notarización y verificación |
| `catalog` | Productos |
| `orders` | Pedidos y su ámbito por rol |
| `payments` | Intención de pago manual |
| `logistics` | Despachos y cadena de frío |
| `accounting` | Reglas, liquidaciones y nómina |
| `insights` | Clima y baseline de calidad |

`app/modules/registry.py` importa todos los modelos para Alembic y
`app/api/v1/api.py` monta los routers. Un módulo nuevo debe registrarse en ambos.

## Rutas base

- `GET /health` y `GET /health/ready`.
- `GET /docs` y `GET /openapi.json`.
- `/api/v1/auth`: login, registro y recuperación de contraseña.
- `/api/v1/users`: perfil, permisos efectivos y usuarios autorizados.
- `/api/v1/admin`: resumen, matriz de acceso, auditoría y gestión de cuentas.
- `/api/v1/batches`: lotes tipados por tipo de producto, trazabilidad, notarización y verificación.
- `/api/v1/products`: catálogo de productos.
- `/api/v1/iot`: dispositivos e ingestión autenticada.
- `/api/v1/orders`: pedidos y estados.
- `/api/v1/operations`: pagos manuales y logística.
- `/api/v1/accounting`: reglas, liquidaciones, margen, salarios y nómina preliminar.
- `/api/v1/weather`: pronóstico de Icononzo, Tolima.
- `/api/v1/ai`: baseline explicable de calidad.

Los recursos internos de `/api/v1/batches` requieren sesión: los productores solo
consultan sus lotes; quien tenga el permiso `traceability.read_all`
(administración y auditoría) revisa el conjunto. El pasaporte público se expone por `/batches/{id}/timeline`.

## Migraciones y pruebas

```bash
alembic upgrade head
alembic check
pytest -q
```

`pytest` usa por defecto la base `<base>_test` del mismo servidor
(`ops/dev-db.sh start` la crea). Puedes indicar otra con `TEST_DATABASE_URL`;
si su nombre no termina en `_test` o `_ci`, pytest se detiene antes de borrar
datos. Para cobertura: `pytest --cov=app -q` (el CI exige 70 %).

Para crear una revisión:

```bash
alembic revision --autogenerate -m "descripcion"
```

Nunca edites una migración ya aplicada en un entorno compartido; crea una nueva revisión.
