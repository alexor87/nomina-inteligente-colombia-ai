

## Plan: Editor Manual de Límites de Empleados y Nóminas por Empresa

### Problema Actual
Los límites de empleados (`max_employees`) y nóminas (`max_payrolls_per_month`) solo se pueden cambiar indirectamente al cambiar de plan. No hay forma de ajustar estos valores de forma independiente para una empresa específica.

### Solución
Agregar un diálogo de edición de límites en el panel de Super Admin (`AdminCompaniesPage`) que permita modificar `max_employees` y `max_payrolls_per_month` directamente en la tabla `company_subscriptions`, sin cambiar el plan.

### Cambios

**1. `src/services/SuperAdminService.ts`** — Nuevo método `updateCompanyLimits(companyId, maxEmployees, maxPayrolls, reason, changedBy)` que:
- Actualiza `max_employees` y `max_payrolls_per_month` en `company_subscriptions`
- Registra un evento de auditoría en `subscription_events`

**2. `src/pages/admin/AdminCompaniesPage.tsx`** — Agregar:
- Nueva columna "Límites" en la tabla mostrando `empleados_actuales / max_employees` con barra de progreso visual
- Botón de edición (icono Settings/Sliders) en la columna de acciones
- Diálogo modal con inputs numéricos para `max_employees` y `max_payrolls_per_month`, campo de razón obligatorio, y botón confirmar

**3. `src/pages/admin/AdminCompanyDetailPage.tsx`** — Agregar botón "Editar límites" en la tarjeta de Suscripción, abriendo el mismo tipo de diálogo.

### Flujo del Usuario
1. Super Admin va a `/admin/companies`
2. Ve la columna "Límites" con uso actual (ej. "8/10")
3. Clic en icono de ajustes → se abre modal
4. Modifica valores → escribe razón → confirma
5. Límites actualizados inmediatamente, evento registrado en auditoría

