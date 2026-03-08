

# Plan: Suite de Tests para Lógica Financiera Crítica

## Alcance

Crear tests unitarios para los 5 servicios de cálculo más críticos del sistema de nómina. Estos son servicios **puros** (sin dependencia de Supabase) o con dependencias fácilmente mockeables.

## Tests a Crear

### 1. `src/services/__tests__/IncapacityCalculationService.test.ts`
- `normalizeSubtype`: mapeo correcto de aliases (comun→general, arl→laboral, etc.)
- `computeIncapacityValue` con política `standard_2d_100_rest_66`:
  - Laboral siempre 100% (5, 15 días)
  - General ≤2 días al 100%
  - General >2 días: 2d×100% + resto×66.67% con piso SMLDV
- `computeIncapacityValue` con política `from_day1_66_with_floor`:
  - Todos los días al 66.67% con piso SMLDV
- Edge cases: salary=0, days=0, days negativos
- Salario mínimo: verificar que el piso SMLDV se aplica correctamente

### 2. `src/services/__tests__/DeductionCalculationService.test.ts`
- `calculateDeductions` (legacy number input): salud 4%, pensión 4%
- `calculateDeductions` (object input): salud, pensión, fondo solidaridad (≥4 SMMLV), retención fuente (≥10 SMMLV)
- `calculateTransportAllowance`: aplica si salario ≤ 2 SMMLV, no aplica si >2 SMMLV
- `calculateProvisions`: cesantías 8.33%, intereses cesantías, prima 8.33%, vacaciones 4.17%
- `calculateEmployerContributions`: salud empleador, pensión, ARL por nivel de riesgo, caja, ICBF, SENA

### 3. `src/services/__tests__/EmployeeValidationService.test.ts`
- `validateAndCleanEmployeeData`: estados válidos, tipos contrato, tipos documento, defaults correctos
- `validateAndCleanEmployeeData`: campos vacíos → null, campos undefined → null
- `validateBasicFields`: errores en cédula vacía, nombre vacío, salario ≤0
- `prepareUpdateData`: mapeo camelCase → snake_case correcto

### 4. `src/services/__tests__/NovedadValidationService.test.ts`
- `validateNovedadData`: tipos válidos pasan, tipos inválidos fallan
- Validación de horas requeridas para horas_extra/recargo_nocturno
- Validación de días requeridos para vacaciones/incapacidad/licencias
- `validateForSave`: requiere company_id adicional

### 5. `src/services/__tests__/ConfigurationService.test.ts`
- `getFallbackConfig` (via `getConfigurationSync`): valores 2025 correctos (SMMLV=$1,423,500, auxilio=$200,000)
- `getFallbackConfig` para 2024: valores diferentes
- Porcentajes correctos (salud 4%, pensión 4%, etc.)
- ARL risk levels correctos
- Fondo solidaridad ranges correctos

## Enfoque Técnico

- **Framework**: Vitest (ya configurado)
- **Sin mocks de Supabase**: Solo testear lógica pura de cálculo. Los métodos que llaman a Supabase se excluyen.
- **Precisión financiera**: Tolerancia de ±1 peso por redondeo en comparaciones numéricas.
- **Cada test verifica la normativa colombiana vigente 2025.**

## Archivos a Crear

| Archivo | Servicios cubiertos | Tests estimados |
|---|---|---|
| `src/services/__tests__/IncapacityCalculationService.test.ts` | Incapacidades | ~15 |
| `src/services/__tests__/DeductionCalculationService.test.ts` | Deducciones, provisiones, aportes | ~20 |
| `src/services/__tests__/EmployeeValidationService.test.ts` | Validación empleados | ~12 |
| `src/services/__tests__/NovedadValidationService.test.ts` | Validación novedades | ~10 |
| `src/services/__tests__/ConfigurationService.test.ts` | Configuración paramétrica | ~8 |

**Total**: ~65 tests cubriendo la lógica financiera crítica del sistema.

