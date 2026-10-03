# Modelo financiero y de liquidaciones

## Fórmula por pedido

```text
ventas_brutas = suma(precio_unitario × cantidad)
costos_directos = suma(costo_directo_unitario × cantidad)
pago_productor = volumen_kg × tarifa_COP_kg
                 o ventas_del_item × porcentaje_productor / 100
comision_vendedor = ventas_del_item × porcentaje_vendedor / 100
margen_CaféTrace = ventas_brutas - costos_directos - logística
                   - pago_productor - comisión_vendedor
```

El margen puede ser negativo y queda en estado `review_required`; no se corrige ni se oculta automáticamente.

## Reglas parametrizables

`compensation_rules` permite definir reglas por usuario, rol, categoría (`coffee`/`cured_meats`) y periodo:

- `fixed_salary`: salario base mensual.
- `volume_kg`: pago por kilogramo entregado.
- `sales_percentage`: porcentaje sobre las ventas del ítem.

La prioridad es: usuario + categoría, usuario, rol + categoría, rol y regla general. Las reglas se versionan con fecha y se auditan al crearse.

## Nómina

`payroll_entries` separa salario fijo, variable, deducciones y neto. El sistema genera una preliquidación; la aprobación y transmisión legal/fiscal requieren revisión del contador.

La nómina electrónica colombiana debe validarse contra los requisitos y anexos técnicos vigentes de la DIAN antes de producción: [Documento soporte de pago de nómina electrónica](https://www.dian.gov.co/impuestos/Paginas/Sistema-de-Factura-Electronica/Documento-Soporte-de-Pago-de-Nomina-Electronica.aspx).

## Endpoints

- `GET /api/v1/accounting/summary`
- `GET /api/v1/accounting/rules`
- `POST /api/v1/accounting/rules`
- `POST /api/v1/accounting/orders/{id}/settlement`
- `GET /api/v1/accounting/orders/{id}/settlement`
- `POST /api/v1/accounting/payroll/preview`
- `GET /api/v1/accounting/payroll`

Los cálculos de liquidación y nómina requieren `accounting.write`; la consulta requiere `accounting.read`.
