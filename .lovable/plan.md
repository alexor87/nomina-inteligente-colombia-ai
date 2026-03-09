

# Plan: Pruebas Unitarias para Integración Contable

## Estado Actual
❌ **No hay pruebas unitarias** para los servicios de integración contable recién creados.

## Tests a Crear

### 1. `AccountingMappingService.test.ts`
- Validación de formato PUC (4-10 dígitos numéricos)
- Obtención de labels y tooltips estándar
- Mock de operaciones Supabase para CRUD

### 2. `AccountingIntegrationService.test.ts`  
- `getIntegration()` - retorna null si no existe
- `saveIntegration()` - crea/actualiza correctamente
- `activateIntegration()` / `deactivateIntegration()`
- `testConnection()` - mock de edge function
- `isAutoSyncEnabled()` - lógica de verificación

### 3. `accounting-sync/index.test.ts` (Edge Function)
- Adaptador Siigo: formato correcto de journal entries
- Adaptador Alegra: formato correcto de journal entries
- Transformación de payroll a asientos contables
- Manejo de errores de API

### 4. `AccountingSoftwareWizard.test.tsx` (Componente UI)
- Render de pasos del wizard
- Validación de formularios
- Interacciones de conexión

## Archivos a Crear
```
src/services/__tests__/AccountingMappingService.test.ts
src/services/__tests__/AccountingIntegrationService.test.ts
src/components/settings/__tests__/AccountingSoftwareWizard.test.tsx
supabase/functions/accounting-sync/index.test.ts
```

