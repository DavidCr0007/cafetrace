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

`admin` tiene todos los permisos. `accountant` gestiona contabilidad y consulta operación financiera. `seller` gestiona catálogo comercial, pedidos y despachos. `producer` gestiona sus lotes, productos, IoT y notarizaciones. `marketing` consulta trazabilidad/catálogo y gestiona acciones comerciales. `buyer` y el rol legado `customer` compran, consultan catálogo/trazabilidad y gestionan su perfil. `auditor` tiene acceso de solo lectura a usuarios, reportes, logística, trazabilidad y auditoría.

La matriz ejecutable está en `backend/app/core/permissions.py` y puede consultarse por un administrador mediante `GET /api/v1/admin/access-matrix`. Cada usuario autenticado puede consultar sus permisos efectivos en `GET /api/v1/users/me/access`. Todos los perfiles tienen `dashboard.read`; el resumen global de operación usa el permiso adicional `dashboard.summary.read` y no se expone a compradores/clientes.

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
- Se mantienen los roles históricos `admin`, `producer` y `customer`; `customer` es equivalente operativo a `buyer` para compatibilidad.
