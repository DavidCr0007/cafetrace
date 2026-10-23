# Auditoría QA y seguridad

- No se generan hashes blockchain simulados; sin configuración la API responde `503`.
- Los endpoints de notarización y administración requieren JWT de productor/admin.
- IoT requiere identificador, token, lote asignado y medición dentro de una ventana temporal.
- Contraseñas no se almacenan en claro; claves blockchain no se versionan.
- Los roles se resuelven mediante permisos explícitos y la recuperación de contraseña requiere aprobación administrativa auditada.
- PostgreSQL es el único motor operativo; SQLite se rechaza al cargar configuración.
- Los access tokens duran 60 minutos y los refresh tokens rotan en cada uso;
  reutilizar uno revocado invalida toda su familia.
- `alembic check`, pruebas backend, lint, TypeScript y build frontend son gates de CI.
- Estado local del 23 de octubre de 2026: 59 pruebas backend verdes sobre
  PostgreSQL, 80,6 % de cobertura, bandit sin hallazgos, y `tsc`, ESLint y build
  Next.js 16.4.2 correctos. `npm audit --omit=dev` no reporta vulnerabilidades;
  quedan avisos solo en dependencias de desarrollo (Tailwind 3, `eslint-config-next`).
- Las pruebas usan una base `_test`/`_ci` y se niegan a ejecutarse contra otra,
  para no borrar la base de desarrollo.
- Antes de producción: secret manager, allowlist CORS, rate limiting/WAF, rotación de tokens IoT, escaneo SAST/DAST, prueba de recuperación y validación formal del contrato desplegado.
