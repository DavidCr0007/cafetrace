# CaféTrace IA

Plataforma de trazabilidad agrícola, comercio electrónico, IoT, blockchain y liquidaciones comerciales para café y cárnicos del Huila.

## Componentes

- `backend/`: API FastAPI, autenticación, RBAC, usuarios, pedidos, logística, contabilidad, IoT y migraciones.
- `frontend/`: aplicación web Next.js, catálogo, trazabilidad y dashboard por rol.
- `blockchain/`: contrato Solidity para notarización en Polygon Amoy.
- `docs/`: modelos de acceso, seguridad, arquitectura y finanzas.
- `ops/`: backup local de SQLite/PostgreSQL.
- `loadtests/`: escenario base de Locust.

## Requisitos

- Python 3.10+; recomendado Python 3.12.
- Node.js 18+; recomendado Node.js 20.
- PostgreSQL 16 para integración; SQLite soportado para desarrollo local.
- Docker y Docker Compose solo para el entorno contenedorizado.

## Desarrollo local

### Backend

Desde la raíz:

```bash
python -m venv .venv  # primera instalación solamente
cd backend
source ../.venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # solo si aún no existe backend/.env
alembic upgrade head
uvicorn app.main:app --reload
```

API: `http://localhost:8000`.

El ejemplo usa PostgreSQL. Para una ejecución local sin PostgreSQL, configura
`DATABASE_URL=sqlite:///./cafetrace.db` en `backend/.env` antes de ejecutar las migraciones.

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
```

### Datos demo

El seed es únicamente para desarrollo y debe ejecutarse después de las migraciones:

```bash
cd backend
python -m scripts.seed
```

El seed crea o sincroniza el administrador y datos demo; también regenera registros de trazabilidad de los lotes demo. No debe ejecutarse en producción ni sobre datos operativos.

### Frontend

En otra terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local  # si aún no existe
npm run dev
```

Frontend: `http://localhost:3000`.

## Accesos y módulos

- `/`: catálogo público.
- `/trace/1`: pasaporte demo de trazabilidad.
- `/dashboard`: dashboard adaptado al rol autenticado.
- `/admin`: panel administrativo y auditoría.
- `/docs`: Swagger de la API.

Roles: `admin`, `accountant`, `seller`, `producer`, `marketing`, `buyer`, `customer` legado y `auditor`.

Todos los perfiles tienen acceso a su dashboard funcional. La autorización real se aplica en el backend; el frontend solo presenta los módulos permitidos. Las métricas globales operativas requieren además `dashboard.summary.read`.

## API relevante

```text
GET  /api/v1/weather/forecast?days=3
GET  /api/v1/users/me/access
GET  /api/v1/admin/access-matrix
POST /api/v1/auth/password-reset/request
GET  /api/v1/accounting/summary
POST /api/v1/accounting/orders/{id}/settlement
GET  /api/v1/batches/{id}/verify
POST /api/v1/batches/{id}/notarize
```

## Migraciones y QA

Desde `backend/`:

```bash
alembic upgrade head
alembic check
pytest -q
```

Desde `frontend/`:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Variables sensibles

- `SECRET_KEY` debe ser aleatoria y exclusiva del entorno.
- `BLOCKCHAIN_PRIVATE_KEY` nunca debe llegar al frontend ni versionarse.
- `DATABASE_URL` define la base usada por Alembic y FastAPI.
- `NEXT_PUBLIC_API_URL` debe apuntar al backend accesible desde el navegador.
- La notarización permanece desactivada hasta configurar RPC, contrato y clave.

## Docker Compose

Copiar `.env.example` a `.env` y reemplazar `POSTGRES_PASSWORD` y `SECRET_KEY`:

```bash
docker compose up --build
```

Backend: `8000`; frontend: `3000`; PostgreSQL: `5432`.

## Documentación complementaria

- [Control de acceso](docs/access-control.md)
- [Modelo financiero](docs/financial-model.md)
- [Modelo de datos](docs/data-model.md)
- [Arquitectura C4](docs/architecture/c4.md)
- [QA y seguridad](docs/security-qa.md)
