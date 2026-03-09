

## Situación Actual

Los planes SaaS están definidos como **constantes estáticas** en el archivo `src/constants/index.ts`. Esto significa que:

1. **No hay una tabla de base de datos para planes** — los planes están "hardcodeados"
2. Para crear o editar planes, actualmente tendrías que **modificar el código** y redesplegar

```text
Arquitectura actual:
┌─────────────────────────────┐
│   src/constants/index.ts    │
│   PLANES_SAAS = [...]       │  ← Hardcoded
└─────────────────────────────┘
          ↓
┌─────────────────────────────┐
│  AdminCompaniesPage.tsx     │
│  SuperAdminService.ts       │  ← Consumen las constantes
│  useSubscriptionLimits.ts   │
└─────────────────────────────┘
```

## Solución Propuesta

Migrar la gestión de planes a la base de datos para que puedas crear/editar/eliminar planes dinámicamente desde el panel de Super Admin.

### Cambios

**1. Base de datos** — Nueva tabla `subscription_plans`:
- `id`, `plan_id` (slug único), `nombre`, `precio`, `max_employees`, `max_payrolls_per_month`, `caracteristicas` (jsonb), `is_active`, `created_at`, `updated_at`
- RLS: Solo superadmins pueden modificar, todos los autenticados pueden leer

**2. Nueva página `/admin/plans`** — CRUD de planes:
- Tabla con lista de planes (nombre, precio, límites, estado)
- Botón "Crear plan" → diálogo con formulario
- Botón editar → mismo diálogo en modo edición
- Botón activar/desactivar

**3. Servicio `PlanService.ts`**:
- `getPlans()`, `createPlan()`, `updatePlan()`, `togglePlanStatus()`

**4. Actualizar código existente**:
- `AdminCompaniesPage.tsx` y `SuperAdminService.ts` → consultar la tabla en vez de constantes
- Mantener `PLANES_SAAS` como fallback mientras migras

### Flujo de Usuario

1. Super Admin va a `/admin/plans`
2. Ve lista de planes actuales
3. Clic "Crear plan" → llena formulario (nombre, precio, límites, características)
4. Guarda → plan disponible para asignar a empresas

