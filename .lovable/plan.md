

## Plan: Crear Pruebas Unitarias del Panel SuperAdmin y Límites de Suscripción

### Alcance de las Pruebas

Cubriré los componentes críticos del PRD implementado:

1. **`useSubscriptionLimits` hook** — Lógica central de enforcement
2. **`SuperAdminService`** — Funciones de gestión cross-company
3. **`UpgradePlanDialog`** — Renderizado del modal de upgrade
4. **`TrialExpiredBanner`** — Renderizado del banner de trial expirado
5. **`AdminLayout`** — Control de acceso al panel admin
6. **`ProtectedRoute`** — Verificación de rol superadmin

### Archivos a Crear

```text
src/hooks/__tests__/useSubscriptionLimits.test.ts
src/services/__tests__/SuperAdminService.test.ts
src/components/subscription/__tests__/UpgradePlanDialog.test.tsx
src/components/subscription/__tests__/TrialExpiredBanner.test.tsx
src/components/admin/__tests__/AdminLayout.test.tsx
```

### Casos de Prueba por Archivo

**useSubscriptionLimits.test.ts:**
- `canAddEmployee()` retorna `false` cuando `employeeCount >= maxEmployees`
- `canAddEmployee()` retorna `false` cuando `isWriteBlocked` (trial expirado)
- `canAddEmployee()` retorna `true` cuando hay espacio disponible
- `canProcessPayroll()` retorna `false` cuando trial expirado
- `suggestedPlan` devuelve el plan siguiente correcto
- `triggerUpgradePrompt()` actualiza `showUpgradeDialog` y `limitType`

**SuperAdminService.test.ts:**
- `getDashboardMetrics()` calcula MRR correctamente
- `getDashboardMetrics()` identifica trials por vencer (< 7 días)
- `changeCompanyPlan()` actualiza suscripción y crea evento de auditoría
- `toggleCompanyStatus()` cambia estado y registra evento

**UpgradePlanDialog.test.tsx:**
- Renderiza título correcto según `limitType` (employees vs payroll)
- Muestra plan actual y plan sugerido
- Botón de contacto abre email correctamente

**TrialExpiredBanner.test.tsx:**
- Renderiza mensaje de expiración
- Botón abre correo de soporte

**AdminLayout.test.tsx:**
- Redirige a dashboard si `isSuperAdmin` es `false`
- Renderiza sidebar con navegación admin si es superadmin
- Botón "Volver a la app" navega a `/modules/dashboard`

### Mocks Necesarios
- `@/integrations/supabase/client` — mock de queries
- `@/contexts/AuthContext` — mock de `useAuth`
- `@/contexts/SubscriptionContext` — mock de `useSubscription`
- `react-router-dom` — mock de `useNavigate`, `Navigate`

