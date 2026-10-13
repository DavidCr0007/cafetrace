# Hoja de ruta de corrección integral

Fecha de inicio: 2026-10-09. Base acordada: PostgreSQL como único motor operativo,
reinicio permitido de las bases locales de desarrollo y paneles MVP completos.

## Objetivo y límites

La intervención corrige la divergencia entre RBAC, API, persistencia y dashboard
para que cada acción tenga actor, ámbito, auditoría y una interfaz coherente.

Incluye:

- autenticación con access token de máximo 60 minutos y refresh rotativo;
- propiedad comprador-pedido y asignación comercial vendedor-lote/producto;
- retiro efectivo del rol legado `customer`;
- idempotencia IoT y auditoría de mutaciones;
- paneles operativos MVP de productos, pedidos, logística, trazabilidad e IoT;
- pruebas por rol, migraciones PostgreSQL, CI y documentación.

No incluye:

- rediseño visual integral;
- despliegue o modificación del contrato Solidity;
- activación de una pasarela de pagos externa real;
- modelos de IA nuevos o aplicación móvil nativa;
- publicación, commit, push o cambios en GitHub sin una solicitud posterior.

## Secuencia y puertas de calidad

### Fase 0 — Línea base y contrato de trabajo

Archivos: `docs/implementation-roadmap.md`, inventario Git y pruebas existentes.

Salida: alcance, archivos previstos y estado inicial documentados. No se modifica
ningún dato real. Puerta: suite existente identificada y cambios previos preservados.

### Fase 1 — PostgreSQL como único motor

Archivos previstos:

- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/alembic/env.py`
- `backend/.env.example`, `.env.example`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `backend/README.md`, `README.md`

Cambios: rechazo de URLs SQLite, configuración PostgreSQL explícita, compose de
desarrollo reproducible y pruebas/migraciones ejecutadas únicamente contra Postgres.

Puerta: `alembic upgrade head`, `alembic check`, downgrade/upgrade y readiness.

### Fase 2 — Modelo de propiedad, sesiones y migración

Archivos previstos:

- `backend/app/models/user.py`
- `backend/app/models/order.py`
- `backend/app/models/product.py`
- `backend/app/models/batch.py`
- `backend/app/models/traceability.py`
- nueva revisión en `backend/alembic/versions/`
- esquemas relacionados en `backend/app/schemas/`

Cambios:

- `customer` se convierte en `buyer` y deja de ser un rol vigente;
- pedido asociado opcionalmente a comprador autenticado;
- lote/producto con responsable comercial explícito;
- tabla de refresh sessions revocables y rotativas;
- `external_id` IoT único para impedir replay.

Puerta: migración desde `head` anterior y creación desde cero en PostgreSQL.

### Fase 3 — Autenticación y sesión segura

Archivos previstos:

- `backend/app/core/security.py`
- `backend/app/api/deps.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/schemas/token.py`
- `backend/app/core/config.py`
- `frontend/src/lib/api.ts`
- `frontend/src/components/RoleDashboard.tsx`

Cambios: access token de 60 minutos, refresh opaco rotativo en cookie HttpOnly,
revocación en logout, detección de reutilización, CORS con credenciales y reintento
controlado del frontend tras un `401`.

Puerta: login, refresh, rotación, logout, expiración y replay automatizados.

### Fase 4 — RBAC, ámbito y auditoría

Archivos previstos:

- `backend/app/core/permissions.py`
- endpoints de `products`, `orders`, `batches`, `operations`, `iot`, `admin`
- `backend/app/services/audit.py`
- pruebas backend por rol.

Cambios: filtros por propietario/responsable, catálogo coherente para vendedor y
productor, pago manual protegido, trazabilidad interna delimitada y eventos de
auditoría en toda mutación operativa.

Puerta: matriz rol-endpoint sin contradicciones, IDOR rechazado y auditoría presente.

### Fase 5 — APIs operativas MVP

Archivos previstos:

- endpoints y esquemas de productos, pedidos, logística, lotes e IoT;
- `frontend/src/lib/api.ts`.

Cambios: listar según ámbito, crear y actualizar productos; consultar y actualizar
pedidos; crear/actualizar despachos; consultar lotes y registros; registrar y listar
dispositivos IoT. No se habilitan eliminaciones irreversibles.

Puerta: contratos OpenAPI y pruebas de casos felices, errores e idempotencia.

### Fase 6 — Dashboards funcionales

Archivos previstos:

- `frontend/src/components/RoleDashboard.tsx`
- nuevos componentes bajo `frontend/src/components/dashboard/`
- `frontend/src/lib/access.ts`, `frontend/src/lib/api.ts`
- estilos globales solo cuando sean necesarios.

Cambios: paneles operativos de productos, pedidos, logística, trazabilidad e IoT;
estados cargando/éxito/error; confirmación de acciones sensibles; reinicio completo
del estado al cerrar sesión. Cada tarjeta “Panel operativo” deberá abrir una función
real; las capacidades no implementadas se identificarán sin simular operatividad.

Puerta: ESLint, TypeScript, build y recorrido por los siete roles vigentes.

### Fase 7 — Regresión, CI y documentación

Archivos previstos:

- `backend/tests/`
- pruebas E2E del frontend y configuración del runner si se incorpora;
- `.github/workflows/ci.yml`
- `README.md`, READMEs internos y documentos de arquitectura/datos/acceso.

Cambios: matriz automatizada rol → módulo → endpoint, cobertura de sesión, alcance,
auditoría, IoT y recorridos UI. CI usa PostgreSQL y bloquea migraciones, pruebas,
lint, tipos o build fallidos.

Puerta final: pipeline local reproducible, comparación antes/después y lista explícita
de cualquier dependencia externa que impida validar una función.

## Archivos fuera de alcance

No se modificarán `blockchain/contracts/CafeTraceRegistry.sol`, firmware inexistente,
activos de marca ni archivos dentro de `.venv`, `node_modules` o `.git`. Los secretos
reales y bases de datos del usuario no se leerán ni se reescribirán.

## Estado verificado al cierre

- PostgreSQL: ciclo `upgrade head → check → downgrade base → upgrade head` correcto.
- Backend: 38 pruebas verdes y 70,87 % de cobertura global; el CI bloquea por
  debajo de 70 % mientras se amplía progresivamente al objetivo de 80 %.
- Frontend: ESLint, TypeScript y build de producción verdes con Next.js 16.
- Perfiles: recorrido real en navegador de los siete roles vigentes, sin errores
  de consola y con navegación limitada por los permisos entregados por la API.
- Administración: creación y cambio de rol confirmados desde la interfaz.
- Responsive: dashboard sin desbordamiento horizontal a 360 px.

Pendiente de una fase posterior: pruebas E2E persistentes con Playwright en CI,
cobertura global de 80 % y 95 % específico en autenticación/RBAC/contabilidad.
