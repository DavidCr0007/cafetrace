# Auditoría QA y seguridad

- No se generan hashes blockchain simulados; sin configuración la API responde `503`.
- Los endpoints de notarización y administración requieren JWT de productor/admin.
- IoT requiere identificador, token, lote asignado y medición dentro de una ventana temporal.
- Contraseñas no se almacenan en claro; claves blockchain no se versionan.
- Los roles se resuelven mediante permisos explícitos y la recuperación de contraseña requiere aprobación administrativa auditada.
- `alembic check`, pruebas backend, lint, TypeScript y build frontend son gates de CI.
- Antes de producción: secret manager, allowlist CORS, rate limiting/WAF, rotación de tokens IoT, escaneo SAST/DAST, prueba de recuperación y validación formal del contrato desplegado.
