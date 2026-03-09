

## Plan: Implementar Fase 7 — Enforcement de Límites de Suscripción

### Objetivo
Completar los requerimientos RF-13, RF-14 y RF-15 del PRD, más las mejoras pendientes en la tabla de empresas (columna trial y sorting).

### Cambios

#### 1. Crear `src/hooks/useSubscriptionLimits.ts`
Hook que expone:
- `canAddEmployee()` — verifica count de empleados vs `max_employees` de `company_subscriptions`
- `canProcessPayroll()` — verifica nóminas del mes vs `max_payrolls_per_month`
- `isWriteBlocked` — true si trial expirado
- `showUpgradePrompt(type)` — muestra dialog de upgrade con plan sugerido

Usa internamente `useSubscription()` del `SubscriptionContext` existente.

#### 2. Crear `src/components/subscription/UpgradePlanDialog.tsx`
Modal reutilizable que muestra:
- Límite actual alcanzado (empleados o nóminas)
- Plan actual vs plan sugerido con precio
- CTA "Contactar para upgrade"

#### 3. Crear `src/components/subscription/TrialExpiredBanner.tsx`
Banner persistente en el dashboard del cliente cuando `isTrialExpired === true`:
- Mensaje de que el trial venció
- Botón de contacto para activar plan
- Se muestra en el layout principal (no en el admin)

#### 4. Integrar enforcement en flujos existentes
- **Creación de empleados**: En el componente/servicio donde se crea un empleado, llamar `canAddEmployee()` antes de proceder. Si retorna false, mostrar `UpgradePlanDialog`.
- **Creación de período de nómina**: Igual con `canProcessPayroll()`.
- **Trial expirado**: En el layout principal, si `isWriteBlocked`, renderizar `TrialExpiredBanner` y deshabilitar botones de crear empleado y liquidar nómina.

#### 5. Mejoras en `AdminCompaniesPage.tsx`
- Agregar columna "Trial expira" que muestra la fecha de `trial_ends_at` con badge de alerta si < 7 días.
- Agregar sorting clickeable en headers de columna (por fecha de registro, cantidad de empleados).

### Archivos a crear
- `src/hooks/useSubscriptionLimits.ts`
- `src/components/subscription/UpgradePlanDialog.tsx`
- `src/components/subscription/TrialExpiredBanner.tsx`

### Archivos a modificar
- `src/pages/admin/AdminCompaniesPage.tsx` — columna trial + sorting
- Componentes de creación de empleados y nómina (integrar checks)
- Layout principal — renderizar banner de trial expirado

### Sin cambios de base de datos
Toda la data necesaria ya existe en `company_subscriptions` (`max_employees`, `max_payrolls_per_month`, `trial_ends_at`).

