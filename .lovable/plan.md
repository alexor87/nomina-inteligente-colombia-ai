

## Plan: Tests para Gestión de Planes

### Archivos a crear

**1. `src/services/__tests__/PlanService.test.ts`** — Tests unitarios del servicio:
- Mock de `supabase` client
- `getPlans()`: verifica query con y sin filtro `activeOnly`
- `createPlan()`: verifica insert con datos correctos
- `updatePlan()`: verifica update parcial con `updated_at`
- `togglePlanStatus()`: verifica toggle de `is_active`
- Manejo de errores (throw en cada método)

**2. `src/pages/admin/__tests__/AdminPlansPage.test.tsx`** — Tests de UI:
- Renderiza tabla con planes mockeados
- Muestra estado "Cargando planes..."
- Muestra "No hay planes configurados" cuando lista vacía
- Botón "Crear Plan" abre diálogo con formulario vacío
- Botón editar abre diálogo con datos pre-llenados
- Validación: ID y nombre obligatorios
- Toggle activo/inactivo llama mutación
- Formato de moneda COP correcto
- Muestra badges de características (máx 2 + contador)

### Enfoque técnico
- Mock de `@tanstack/react-query` hooks o wrapping con `QueryClientProvider`
- Mock de `PlanService` para aislar la UI
- Mock de `@/hooks/use-toast` para verificar notificaciones

