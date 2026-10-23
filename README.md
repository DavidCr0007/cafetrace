# CaféTrace IA

Plataforma de trazabilidad agrícola, comercio electrónico, IoT, blockchain y liquidaciones comerciales para café y cárnicos de las fincas de Icononzo, Tolima.

## Componentes

- `backend/`: API FastAPI organizada por dominios en `app/modules/` (ver abajo), migraciones y pruebas.
- `frontend/`: aplicación web Next.js, catálogo, trazabilidad y dashboard por rol.
- `blockchain/`: contrato Solidity para notarización en Polygon Amoy.
- `docs/`: modelos de acceso, seguridad, arquitectura y finanzas.
- `ops/`: PostgreSQL local aislado, respaldos y utilidades operativas.
- `loadtests/`: escenario base de Locust.

## Estructura del backend

```text
backend/app/
├── core/          # configuración, base de datos, seguridad y rate limit
├── api/v1/api.py  # composición de routers; las rutas públicas no cambian
└── modules/
    ├── identity/      # usuarios, sesiones, autenticación y RBAC (permissions.py)
    ├── audit/         # eventos de auditoría y vistas de supervisión (/admin/summary, /admin/audit-events)
    ├── traceability/  # lotes tipados café/cárnicos (attributes.py), registros e IoT
    ├── blockchain/    # hash canónico, notarización y verificación en Polygon
    ├── catalog/       # productos
    ├── orders/        # pedidos y ámbito por rol (service.py)
    ├── payments/      # intención de pago
    ├── logistics/     # despachos y cadena de frío
    ├── accounting/    # reglas, liquidaciones y nómina
    ├── insights/      # pronóstico del clima y baseline de calidad
    └── registry.py    # carga todos los modelos para Alembic y las relaciones
```

Cada módulo agrupa `models.py`, `schemas.py`, su router y, si aplica, `service.py`.

## Trazabilidad tipada

Todo lote declara `product_type` (`coffee` o `meat`), inmutable tras su creación.
`details` se valida contra un esquema por tipo con núcleo obligatorio, extras
opcionales declarados y rechazo de claves desconocidas, para que el hash
notarizado sea predecible:

- **Café:** finca, altitud (msnm), variedad, inicio y fin de cosecha, proceso,
  método y días de secado, tipo de tostado. Opcionales: fermentación, humedad,
  fecha de tostión, puntaje SCA (un decimal) y notas de taza.
- **Cárnicos:** finca, especie (bovino, porcino, avícola), edad en meses,
  alimentación, tipo de refrigeración, rango de temperatura y fecha de
  sacrificio. Se exige coherencia de cadena de frío: refrigerado entre −2 °C y
  4 °C, congelado con máxima ≤ −18 °C.

El origen toma por defecto Icononzo, Tolima. Tras notarizar un lote, sus
atributos no pueden modificarse (`409`). El pasaporte público
(`/batches/{id}/timeline`) solo expone los atributos aptos para consulta
anónima; notas internas y registros ICA quedan fuera.

## Requisitos

- Python 3.10+; recomendado Python 3.12.
- Node.js 20.9+; recomendado Node.js 20 LTS.
- PostgreSQL 16 para desarrollo, pruebas, integración y producción.
- Docker Engine con el complemento `docker compose`, solo para el entorno contenedorizado.

## Desarrollo local

### Backend

Desde la raíz:

```bash
./ops/dev-db.sh start
python -m venv .venv  # primera instalación solamente
cd backend
source ../.venv/bin/activate
pip install -r requirements.txt
test -f .env || cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

API: `http://localhost:8000`.

La aplicación exige PostgreSQL. `DATABASE_URL` debe comenzar por
`postgresql://` o `postgresql+psycopg://`; SQLite ya no es una ruta operativa.
No ejecutes `cp .env.example .env` si el archivo ya existe porque sobrescribiría
la configuración local. El script `ops/dev-db.sh` crea un clúster aislado en
`.runtime/postgres` y usa `127.0.0.1:55432`, evitando colisionar con PostgreSQL
del sistema en `5432`. No elimina ni modifica otras instancias.

```bash
./ops/dev-db.sh status
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
./ops/dev-db.sh stop  # cuando termines la sesión local
```

`/health` confirma que el proceso responde; `/health/ready` solo devuelve 200
cuando la conexión con PostgreSQL también funciona. Si el puerto `8000` ya está
ocupado, detén el proceso anterior desde su terminal con `Ctrl+C` y verifica el
propietario con `ss -ltnp 'sport = :8000'`.

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

Roles: `admin`, `accountant`, `seller`, `producer`, `marketing`, `buyer` y `auditor`.

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

Las pruebas eliminan y recrean todas las tablas, por eso nunca usan la base de
desarrollo: por defecto se conectan a `<base>_test` en el mismo servidor
(`ops/dev-db.sh start` la crea junto con la principal). Para otra base, define
`TEST_DATABASE_URL`. El fixture aborta la sesión si el nombre de la base no
termina en `_test` o `_ci`.

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
- El access token dura como máximo 60 minutos. El refresh token se rota, puede
  revocarse y se transporta únicamente en una cookie `HttpOnly`.
- `NEXT_PUBLIC_API_URL` debe apuntar al backend accesible desde el navegador.
- `ENVIRONMENT=production` exige una `SECRET_KEY` de al menos 32 caracteres y una allowlist `CORS_ORIGINS` sin comodines ni orígenes locales.
- La notarización permanece desactivada hasta configurar RPC, contrato y clave.
- Login, OAuth y recuperación se limitan a 5 intentos por IP cada 60 segundos de forma predeterminada; ajusta `AUTH_RATE_LIMIT_ATTEMPTS` y `AUTH_RATE_LIMIT_WINDOW_SECONDS` por entorno.

El historial debe pasar el gate de CI que rechaza `.git-new`. Si se necesita
limpiar una rama ya publicada, crea un respaldo, reescribe todas sus
referencias y publica el nuevo hash con `--force-with-lease`; rota cualquier
credencial que haya existido en el historial antes de publicar.

Antes de confirmar cambios valida qué se enviará al repositorio:

```bash
bash ops/check-repo-hygiene.sh
git status --short
git diff --check
```

Solo se versionan código fuente, migraciones, pruebas, documentación, archivos
de bloqueo y configuraciones de ejemplo. Se excluyen `.env`, bases locales,
entornos virtuales, dependencias instaladas, builds, cobertura, logs, respaldos,
claves, certificados y repositorios Git anidados.

## Docker Compose

### Comprobación previa

La presencia del cliente no garantiza que el daemon esté funcionando. Valida
por separado el cliente, Compose y el servicio:

```bash
docker --version
docker compose version
docker info
docker compose --env-file .env.example config --quiet
```

- Si los dos primeros comandos responden, Docker y Compose están instalados.
- Si `docker info` falla, revisa primero `systemctl status docker.service` y
  `journalctl -u docker.service -n 100 --no-pager`. No modifiques grupos de
  usuario antes de confirmar que el daemon está activo.
- `docker compose ... config --quiet` valida la interpolación y estructura del
  compose sin descargar imágenes ni iniciar contenedores.

En Arch Linux, un kernel actualizado pendiente de reinicio puede dejar al
kernel activo sin sus módulos y hacer que Docker falle al crear la red bridge
con errores de `iptables`, `addrtype` o `iptable_nat`. Compruébalo con:

```bash
uname -r
pacman -Q linux
modinfo xt_addrtype
```

Si la versión instalada no coincide con `uname -r`, reinicia el sistema para
cargar el kernel instalado. Después del reinicio:

```bash
sudo systemctl reset-failed docker.service docker.socket
sudo systemctl enable --now docker.service
docker info
```

Solo si el servicio está activo y todavía aparece `permission denied`, revisa
los permisos de `/var/run/docker.sock` y la pertenencia al grupo `docker`. Ten
en cuenta que ese grupo concede privilegios equivalentes a administración del
host.

### Arranque contenedorizado

Copia `.env.example` a `.env`, reemplaza `POSTGRES_PASSWORD`, `SECRET_KEY` y la
allowlist `CORS_ORIGINS`, y valida la configuración antes de levantarla:

```bash
test -f .env || cp .env.example .env
# Edita .env antes de continuar.
docker compose --env-file .env config --quiet
docker compose --env-file .env up --build
```

Estado y apagado ordenado:

```bash
docker compose ps
docker compose down
```

Backend: `8000`; frontend: `3000`; PostgreSQL queda disponible solo para los
contenedores de la red interna y no publica el puerto `5432` en el host.
Define `CORS_ORIGINS` como JSON con el dominio publicado, por ejemplo
`["https://app.cafetrace.co"]`.

## Documentación complementaria

- [Control de acceso](docs/access-control.md)
- [Modelo financiero](docs/financial-model.md)
- [Modelo de datos](docs/data-model.md)
- [Arquitectura C4](docs/architecture/c4.md)
- [QA y seguridad](docs/security-qa.md)
