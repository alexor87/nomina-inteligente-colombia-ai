# 🏗️ Temporal Query Architecture

## ✅ Arquitectura Implementada

Esta arquitectura centraliza el manejo de queries temporales en Maya Intelligence, eliminando duplicación y mejorando escalabilidad.

---

## 📐 Capas del Sistema

### 1️⃣ **LLM Classifier** (`llm-query-classifier.ts`)
- **Responsabilidad**: Clasificar queries y extraer contexto temporal
- **Output**: `LLMClassification` con `extractedContext`
- **Mejoras implementadas**:
  - ✅ Agregado `monthCount` al schema para "últimos N meses"
  - ✅ Agregado `LAST_N_MONTHS` al enum de `temporalModifier`
  - ✅ Fix en `parseTextFallback` para extraer `monthCount` correctamente

### 2️⃣ **Temporal Resolver** (`temporal-resolver.ts`) - 🆕 NUEVO
- **Responsabilidad**: Convertir `extractedContext` del LLM a `TemporalParams` estándar
- **Métodos principales**:
  - `resolve(extractedContext)`: Convierte contexto a TemporalParams
  - `getDisplayName(temporalParams)`: Genera nombre legible
  - `fromLegacy(params)`: Convierte params legacy a TemporalParams
- **Soporta**:
  - `LAST_YEAR` → año anterior
  - `THIS_YEAR` → año actual
  - `LAST_N_MONTHS` → últimos N meses
  - `SPECIFIC_MONTH` → mes específico
  - `QUARTER` → trimestre
  - `SEMESTER` → semestre
  - `SPECIFIC_PERIOD` → período específico por ID

### 3️⃣ **Period Query Builder** (`period-query-builder.ts`) - 🆕 NUEVO
- **Responsabilidad**: Obtener períodos de DB basado en TemporalParams
- **Método principal**: `resolvePeriods(client, companyId, temporalParams)`
- **Métodos privados especializados**:
  - `getYearPeriods()` - Todos los períodos de un año
  - `getLastNMonthsPeriods()` - Últimos N meses
  - `getMonthPeriods()` - Períodos de un mes específico
  - `getQuarterPeriods()` - Períodos de un trimestre
  - `getSemesterPeriods()` - Períodos de un semestre
  - `getMostRecentPeriod()` - Período más reciente

### 4️⃣ **Aggregation Services** (`AggregationService.ts`) - 🔄 REFACTORIZADO
- **Responsabilidad**: Realizar agregaciones de datos
- **Mejoras implementadas**:
  - ✅ `getTotalIncapacityDays`: Acepta `TemporalParams | legacy` + usa `PeriodQueryBuilder`
  - ⏳ `getTotalPayrollCost`: Pendiente refactorizar
  - ⏳ `getSecurityContributions`: Pendiente refactorizar

---

## 🔄 Flujo de Datos

```
Usuario: "¿Cuántos días de incapacidad el año pasado?"
    ↓
[1] LLM Classifier
    → queryType: TEMPORAL_FOLLOWUP
    → extractedContext: { temporalModifier: "LAST_YEAR", year: 2024 }
    ↓
[2] Temporal Resolver
    → TemporalParams: { type: FULL_YEAR, year: 2024 }
    ↓
[3] Period Query Builder
    → SELECT * FROM payroll_periods_real WHERE year = 2024 AND estado = 'cerrado'
    → ResolvedPeriods: { periods: [...], displayName: "Año 2024" }
    ↓
[4] Aggregation Service (getTotalIncapacityDays)
    → SELECT * FROM payroll_novedades WHERE periodo_id IN (...)
    → Calcular totales, breakdown por subtipo
    ↓
Usuario recibe: "🏥 Días de Incapacidad - Año 2024: 45 días en 12 períodos"
```

---

## ✅ Queries Soportadas

| Query del usuario | Tipo | Parámetros |
|-------------------|------|------------|
| "y el año pasado?" | `FULL_YEAR` | year: 2024 |
| "y este año?" | `FULL_YEAR` | year: 2025 |
| "y los últimos 3 meses?" | `LAST_N_MONTHS` | monthCount: 3 |
| "y los últimos 6 meses?" | `LAST_N_MONTHS` | monthCount: 6 |
| "y en enero?" | `SPECIFIC_MONTH` | month: enero, year: 2025 |
| "y el primer trimestre?" | `QUARTER` | quarter: 1, year: 2025 |
| "y el segundo semestre?" | `SEMESTER` | semester: 2, year: 2025 |

---

## 🔧 Backward Compatibility

Todos los servicios refactorizados mantienen **100% backward compatibility**:

```typescript
// ✅ Formato legacy sigue funcionando
await getTotalIncapacityDays(client, { month: 'enero', year: 2025 });
await getTotalIncapacityDays(client, { periodId: '...' });

// ✅ Nuevo formato con TemporalParams
await getTotalIncapacityDays(client, {
  type: TemporalType.LAST_N_MONTHS,
  monthCount: 3
});
```

El servicio detecta automáticamente el formato y convierte legacy a TemporalParams usando `TemporalResolver.fromLegacy()`.

---

## 📈 Beneficios

### 1. **DRY (Don't Repeat Yourself)**
- **Antes**: Cada servicio implementaba su propia lógica temporal (500+ líneas duplicadas)
- **Después**: Lógica centralizada en 3 archivos (~400 líneas reutilizables)

### 2. **Escalabilidad**
Agregar nuevos tipos temporales requiere solo:
1. Agregar enum en `TemporalType`
2. Agregar case en `TemporalResolver.resolve()`
3. Agregar case en `PeriodQueryBuilder.resolvePeriods()`

**TODOS** los servicios lo heredan automáticamente ✅

### 3. **Testeable**
Cada capa se puede testear independientemente:
```typescript
describe('TemporalResolver', () => {
  it('converts LAST_YEAR to TemporalParams', () => {
    const params = TemporalResolver.resolve({ temporalModifier: 'LAST_YEAR' });
    expect(params.type).toBe(TemporalType.FULL_YEAR);
    expect(params.year).toBe(2024);
  });
});
```

### 4. **Mantenibilidad**
- Código centralizado, fácil de encontrar y modificar
- Nombres consistentes entre servicios
- Documentación clara de responsabilidades

---

## 🚀 Estado de Implementación

### ✅ Completado
- [x] `temporal-types.ts` - Tipos e interfaces
- [x] `temporal-resolver.ts` - Lógica de conversión
- [x] `period-query-builder.ts` - Query builder
- [x] `llm-query-classifier.ts` - Schema actualizado + parseTextFallback fix
- [x] `temporal-followup-handler.ts` - Integración con TemporalResolver
- [x] `getTotalIncapacityDays` - Refactorizado con TemporalParams

### ⏳ Pendiente
- [ ] `getTotalPayrollCost` - Refactorizar
- [ ] `getSecurityContributions` - Refactorizar
- [ ] `getTotalOvertimeHours` - Refactorizar
- [ ] `getHighestCostEmployees` - Refactorizar
- [ ] Tests unitarios por capa

---

## 📝 Notas de Migración

### Para refactorizar un servicio existente:

1. **Agregar imports**:
```typescript
import { TemporalParams, TemporalType } from '../core/temporal-types.ts';
import { PeriodQueryBuilder } from '../core/period-query-builder.ts';
import { TemporalResolver } from '../core/temporal-resolver.ts';
```

2. **Actualizar firma del servicio**:
```typescript
// Antes
export async function getTotalPayrollCost(
  client: any,
  params: { month?: string; year?: number; periodId?: string }
): Promise<AggregationResult>

// Después
export async function getTotalPayrollCost(
  client: any,
  params: TemporalParams | { month?: string; year?: number; periodId?: string }
): Promise<AggregationResult>
```

3. **Agregar lógica de conversión**:
```typescript
// Detectar y convertir legacy params
let temporalParams: TemporalParams;
if ('type' in params && params.type) {
  temporalParams = params as TemporalParams;
} else {
  temporalParams = TemporalResolver.fromLegacy(params);
}
```

4. **Usar PeriodQueryBuilder**:
```typescript
// Reemplazar lógica manual de queries
const resolved = await PeriodQueryBuilder.resolvePeriods(client, companyId, temporalParams);

if (!resolved) {
  return { message: `❌ No encontré períodos para ${TemporalResolver.getDisplayName(temporalParams)}` };
}

// Iterar sobre períodos resueltos
for (const period of resolved.periods) {
  // ... agregar datos
}
```

5. **Usar displayName en respuestas**:
```typescript
return {
  message: `📊 Resultado - ${resolved.displayName}\n\n...`,
  data: { period: resolved.displayName, ... }
};
```

---

## 🎯 Ejemplo Completo

Ver implementación completa en `getTotalIncapacityDays` (líneas 1129-1264 de `AggregationService.ts`)
