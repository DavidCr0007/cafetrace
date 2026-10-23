# Gobierno de acceso y trazabilidad

## Módulos

| Módulo | Alcance operativo |
|---|---|
| Administración | Usuarios, roles, permisos, configuración, auditoría y control general |
| Contabilidad | Pagos, conciliación, facturación y reportes financieros |
| Ventas | Catálogo, clientes, pedidos, estados comerciales y logística de despacho |
| Producción | Lotes, procesos, IoT, calidad y origen |
| Marketing | Catálogo visible, campañas, métricas comerciales y reportes |
| Compras | Catálogo, pedidos propios, pagos y trazabilidad pública |
| Auditoría | Lectura de usuarios, movimientos, reportes, logística, blockchain y eventos |
| Blockchain | Notarización, verificación de integridad y evidencias de transacción |
| Logística | Despachos, tracking y cadena de frío |

## Roles

`admin` tiene todos los permisos. `accountant` gestiona contabilidad y consulta operación financiera. `seller` gestiona su catálogo comercial, pedidos asignados y despachos. `producer` gestiona sus lotes, productos, IoT y notarizaciones, y puede vender directamente: si un producto no tiene vendedor asignado, el productor queda como responsable comercial y gestiona sus pedidos y despachos. `marketing` consulta trazabilidad/catálogo y gestiona acciones comerciales. `buyer` compra, consulta sus pedidos y gestiona su perfil. `auditor` tiene acceso de solo lectura a usuarios, reportes, logística, trazabilidad y auditoría. El rol legado `customer` se migra a `buyer` y ya no puede asignarse.

La matriz ejecutable está en `backend/app/modules/identity/permissions.py` y puede consultarse por un administrador mediante `GET /api/v1/admin/access-matrix`. Cada usuario autenticado puede consultar sus permisos efectivos en `GET /api/v1/users/me/access`. Todos los perfiles tienen `dashboard.read`; el resumen global de operación usa el permiso adicional `dashboard.summary.read` y no se expone a compradores.

Los permisos de ámbito sustituyen las comprobaciones por nombre de rol:

- `traceability.read_all` (admin, auditor, marketing): consulta lotes de cualquier productor; sin él, solo los propios.
- `traceability.manage_all` (solo admin): modifica, notariza o registra evidencia sobre lotes ajenos.
- Pedidos: el ámbito se resuelve en `orders/service.py`. Supervisión (admin, contador, auditor) ve todo; el comprador ve sus pedidos; vendedor y productor ven los pedidos donde son responsables comerciales. Un rol no contemplado no ve nada.
- Los recursos fuera de ámbito responden `404` para no revelar su existencia.

## Recuperación de acceso

1. El usuario solicita recuperación mediante correo o código de acceso en `POST /api/v1/auth/password-reset/request`.
2. La respuesta es genérica para no revelar si el correo existe.
3. Se crea una solicitud con expiración de 30 minutos y evento de auditoría.
4. Un administrador consulta solicitudes pendientes.
5. El administrador aprueba o rechaza la solicitud; al aprobar define la nueva contraseña.
6. Las contraseñas se almacenan con bcrypt y los códigos de acceso con HMAC-SHA256 usando el secreto de aplicación.

El código de acceso se rota desde `POST /api/v1/admin/users/{user_id}/access-code` y se entrega una sola vez. En una siguiente iteración puede sustituirse por OTP enviado por correo/SMS sin cambiar el modelo de aprobación.

## Controles

- Nunca se permite asignar roles privilegiados desde el registro público.
- El registro, el cambio de contraseña y la aprobación de recuperación exigen contraseñas de mínimo 12 caracteres.
- No se permite desactivar al administrador actual ni dejar el sistema sin un administrador activo.
- Los cambios de rol, estado, códigos y contraseñas generan eventos de auditoría.
- El access token expira en un máximo de 60 minutos; la sesión prolongada usa
  refresh tokens opacos, rotativos y revocables en cookie `HttpOnly`.
- La desactivación, el cambio de contraseña y la recuperación aprobada revocan
  las sesiones de actualización vigentes del usuario.
