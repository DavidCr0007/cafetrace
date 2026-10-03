# CaféTrace IA — Frontend

Aplicación Next.js para catálogo, pasaporte de trazabilidad, panel administrativo y dashboards por rol.

## Instalación y configuración

```bash
npm ci
cp .env.example .env.local
```

Variables:

- `NEXT_PUBLIC_API_URL`: URL pública del backend, por defecto `http://localhost:8000/api/v1`.
- `NEXT_PUBLIC_DEMO_MODE`: mantener `false`; el catálogo no debe ocultar errores con datos ficticios.

## Ejecución

```bash
npm run dev
```

Rutas principales:

- `/`: catálogo público.
- `/trace/[batchId]`: pasaporte del lote y clima de Icononzo.
- `/dashboard`: dashboard adaptado a los permisos del usuario.
- `/admin`: panel administrativo.

## QA local

```bash
npm run lint
npx tsc --noEmit
npm run build
```

La autorización se valida en el backend. Ocultar un botón en frontend no constituye una medida de seguridad.

La configuración de estilos está en `tailwind.config.ts` y `postcss.config.js`. Si aparecen estilos sin procesar, detén Next.js, elimina `.next` y ejecuta nuevamente `npm run dev`.
