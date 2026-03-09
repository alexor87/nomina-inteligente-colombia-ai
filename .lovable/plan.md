

# Plan: Configuración de Cuentas PUC para Contadores Avanzados

## El Problema
El 95% de contadores usa el PUC estándar. El 5% restante necesita personalizar cuentas porque:
- Su empresa tiene un plan de cuentas corporativo diferente
- Usan subcuentas específicas (ej: 510506001 en vez de 510506)
- Su software contable requiere códigos auxiliares

## Solución: Editor de Mapeo PUC Simple

### Base de Datos

**Nueva tabla `accounting_account_mappings`:**
```sql
company_id, concept (enum), puc_account, puc_description, entry_type, is_active
```

Se pre-popula con ~18 conceptos estándar de nómina colombiana (salarios, aportes, provisiones, etc.)

### UI en IntegracionesSettings

Un tab "Cuentas Contables" con tabla editable:

```
┌─────────────────────────────────────────────────────────────┐
│  Configuración de Cuentas PUC                               │
│                                                              │
│  Concepto de Nómina    │ Cuenta PUC │ Descripción    │ Tipo │
│  ──────────────────────────────────────────────────────────  │
│  Salarios              │ [510506 ]  │ Sueldos y...   │ D    │
│  Auxilio Transporte    │ [510527 ]  │ Auxilio de...  │ D    │
│  Aportes Salud Empl.   │ [237005 ]  │ Aportes a...   │ C    │
│  Aportes Pensión Empl. │ [238030 ]  │ Aportes a...   │ C    │
│  ...                                                        │
│                                                              │
│  [Restaurar valores por defecto]  [Guardar cambios]         │
└─────────────────────────────────────────────────────────────┘
```

**Características:**
- Campos editables inline (clic para editar cuenta/descripción)
- Tooltips explicando qué es cada concepto
- Validación de formato PUC (solo números, 4-10 dígitos)
- Botón "Restaurar defaults" para volver al PUC estándar

### Flujo de Uso

1. Contador entra a **Configuración → Integraciones → Cuentas Contables**
2. Ve la tabla pre-llenada con valores estándar
3. Edita solo las cuentas que necesita cambiar
4. Guarda cambios
5. La próxima exportación/sincronización usa sus cuentas personalizadas

### Orden de Implementación

1. Migración: crear tabla `accounting_account_mappings` + seed con PUC estándar (~18 conceptos)
2. Crear `AccountingMappingService.ts` (CRUD + defaults)
3. Agregar componente `PUCMappingEditor.tsx` con tabla editable
4. Integrar en `IntegracionesSettings.tsx` como tab
5. Refactorizar `ReportsDBService.getAccountingExports()` para usar el mapeo personalizado

