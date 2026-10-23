# Modelo de datos actualizado

Entidades principales: `users`, `refresh_sessions`, `password_reset_requests`, `batches`, `products`, `orders`, `order_items`, `traceability_records`.

Operación etapa 2: `iot_devices`, `audit_events`, `blockchain_notarizations`.

Operación etapa 3: `payments`, `shipments`, `compensation_rules`, `order_settlements`, `settlement_allocations`, `payroll_entries`.

Trazabilidad tipada: `batches.product_type` (`coffee` | `meat`, restricción `ck_batches_product_type`) determina el esquema de `batches.details`, definido en `backend/app/modules/traceability/attributes.py`. La migración `c078b39ae512` clasifica los lotes previos como `meat` si declaran `species` o `sanitary_license`, y como `coffee` en otro caso. Sus `details` legados no se revalidan hasta la siguiente edición.

Relaciones críticas: un lote pertenece a un productor y puede tener un vendedor responsable; un producto conserva el vendedor responsable; un lote tiene muchos registros IoT; `traceability_records.external_id` es único para bloquear replays; un lote tiene como máximo una notarización; un pedido puede pertenecer a un comprador autenticado, tiene muchos ítems y una relación de pago/logística; un pedido puede asignarse a un vendedor; una liquidación pertenece a un pedido y contiene asignaciones para productor, vendedor y margen de CaféTrace; una solicitud de recuperación pertenece a un usuario y puede ser aprobada por un administrador; cada refresh token pertenece a una familia revocable y solo puede usarse una vez.
