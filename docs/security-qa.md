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
- Estado local del 9 de octubre de 2026: 38 pruebas backend verdes sobre
  PostgreSQL, 70,87 % de cobertura, build Next.js 16 correcto y recorrido manual
  de los siete roles sin errores de consola.
- Antes de producción: secret manager, allowlist CORS, rate limiting/WAF, rotación de tokens IoT, escaneo SAST/DAST, prueba de recuperación y validación formal del contrato desplegado.
