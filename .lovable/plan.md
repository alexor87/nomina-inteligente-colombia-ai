

# Revisión CTO del Proyecto: Nómina Inteligente Colombia

---

## 1. Visión General

Sistema de nómina colombiana con asistente IA (Maya), construido en React + Supabase. Cubre: gestión de empleados, liquidación de nómina, prestaciones sociales, vacaciones/ausencias, reportes, y comprobantes de pago.

**Stack**: React 18 + Vite + TypeScript + Tailwind + Supabase (auth, DB, Edge Functions, Storage) + Zustand + React Query.

---

## 2. HALLAZGOS CRITICOS DE SEGURIDAD

El scan de seguridad revela **2 vulnerabilidades de nivel ERROR** y **4 de nivel WARN** que requieren acción inmediata:

### CRITICO - Datos expuestos sin autenticación
- **`processed_commands`**: RLS policy `USING(true)` + `WITH CHECK(true)` en rol `public`. Cualquier usuario NO autenticado puede leer y escribir datos de operaciones de nómina, incluyendo payloads de request/response. **Riesgo: exfiltración de datos salariales.**
- **`session_states`**: Mismo problema. Estados de workflow de nómina expuestos a internet.

### CRITICO - Escalación de privilegios
- **`user_roles`**: Existen políticas ALL demasiado amplias (`Basic: Users manage their company roles` y `Manage company roles`) que permiten a cualquier usuario autenticado asignarse el rol `administrador`. Solo la política `Simple user roles management` valida correctamente que el usuario ya tenga rol admin/soporte.

### WARN - Inserts sin autenticación
- `employee_identity_ledger`: INSERT con `WITH CHECK(true)` - datos PII de empleados.
- `security_audit_log`: INSERT abierto - permite contaminar logs de auditoría.
- `conversation_events`: INSERT abierto.

### Otras advertencias
- 12 funciones SQL sin `search_path` configurado (riesgo de SQL injection por schema confusion).
- 5 políticas RLS con `USING(true)` / `WITH CHECK(true)`.
- Protección contra passwords filtrados deshabilitada.
- OTP con expiración larga.
- Versión de PostgreSQL con parches de seguridad pendientes.

---

## 3. DEUDA TECNICA - NIVEL ALTO

### 3.1 Proliferación masiva de servicios (~100 archivos)
El directorio `src/services/` tiene **100+ archivos** con patrones de duplicación severa:

```text
PayrollCalculationService.ts
PayrollCalculationSimple.ts
PayrollCalculationEnhancedService.ts
PayrollCalculationUnifiedService.ts
PayrollCalculationBackendService.ts
PayrollCalculationEngine.ts
```

Mismo patrón se repite para: Employee (8+ servicios), Payroll (25+ servicios), Novedades (6+ servicios). Muchos son wrappers deprecated que delegan a versiones "Secure" o "Unified".

### 3.2 Páginas duplicadas
Tres versiones de la página de liquidación:
- `PayrollLiquidationPage.tsx`
- `PayrollLiquidationPageSimple.tsx`
- `PayrollLiquidationPageSimplified.tsx` (la activa)

Dos versiones de vacaciones:
- `VacationsAbsencesPage.tsx` (activa)
- `VacationsAbsencesPageEnhanced.tsx`

Solo una se usa en el router. Las demás son código muerto.

### 3.3 Console.log masivo
**8,131 console.log** en **254 archivos**. Esto impacta rendimiento en producción y expone información sensible (datos salariales, IDs de empleados) en la consola del navegador.

### 3.4 Hooks con variantes redundantes
```text
useEmployeeCRUD.ts / useEmployeeCRUDFixed.ts / useEmployeeCRUDRobust.ts
usePayrollLiquidation.ts / usePayrollLiquidationRobust.ts / usePayrollLiquidationSimplified.ts
useEmployeeFormSubmission.ts / useEmployeeFormSubmissionRobust.ts
```

### 3.5 Servicios deprecated activos
`PayrollUnifiedService.ts`, `EmployeeService.ts`, `NovedadesService.ts` son wrappers deprecated que generan warnings en cada llamada, pero siguen en uso.

---

## 4. ARQUITECTURA

### 4.1 Positivo
- **Edge Functions bien organizadas**: 21 funciones con responsabilidades claras (cálculos, liquidación, provisiones, PDF, email).
- **RLS aplicado ampliamente**: La mayoría de tablas tienen políticas correctas con `get_current_user_company_id()`.
- **Separación auth/app**: `AuthContext` + `SubscriptionContext` + `YearContext` son claros.
- **React Query**: Bien integrado para data fetching.
- **Zustand**: Presente para estado global.
- **Sistema Maya (IA)**: Arquitectura modular con provider, engine, flows, types.

### 4.2 Preocupaciones arquitectónicas
- **Sin lazy loading**: Todas las páginas se importan directamente en `App.tsx`. Bundle inicial innecesariamente grande.
- **Layout duplicado**: Existe `Layout.tsx` con `Sidebar` + `Header`, pero el router usa `MayaFullScreenLayout`. `Layout.tsx` parece no utilizarse.
- **Sin error boundaries**: No hay manejo global de errores de rendering.
- **Sin tests significativos**: Solo se encontraron archivos de test para `MayaProvider` y `use-ui-block-detector`. La cobertura es casi nula para un sistema financiero.

---

## 5. BASE DE DATOS

### 5.1 Positivo
- Estructura relacional sólida con tablas bien normalizadas.
- Auditoría implementada (`payroll_novedades_audit`, `payroll_reopen_audit`, `payroll_version_history`).
- Configuraciones parametrizadas por empresa (`company_payroll_configurations`, `company_settings`).
- `social_benefit_payments` con soporte de anulación.

### 5.2 Problemas
- **Tablas `payroll_periods` y `payroll_periods_real`**: Dos tablas para lo mismo. Indica migración incompleta.
- **Foreign keys incompletas**: Varias tablas no tienen FKs definidas (según el schema proporcionado), lo cual puede llevar a datos huérfanos.
- **Sin índices visibles**: No se puede confirmar, pero es probable que falten índices en queries frecuentes.

---

## 6. RECOMENDACIONES PRIORIZADAS

### P0 - Inmediato (esta semana)
1. **Corregir RLS de `processed_commands` y `session_states`**: Cambiar rol de `public` a `service_role`.
2. **Corregir escalación de privilegios en `user_roles`**: Eliminar o restringir las políticas ALL amplias.
3. **Restringir inserts abiertos** en `employee_identity_ledger`, `security_audit_log`, `conversation_events`.
4. **Habilitar leaked password protection** en Supabase.

### P1 - Corto plazo (2-4 semanas)
5. **Eliminar código muerto**: Páginas no usadas, servicios deprecated, hooks duplicados. Estimado: ~40 archivos removibles.
6. **Implementar lazy loading** con `React.lazy()` en `App.tsx`.
7. **Eliminar o condicionar console.logs**: Crear un logger wrapper que solo emita en desarrollo.
8. **Configurar `search_path`** en las 12 funciones SQL afectadas.

### P2 - Mediano plazo (1-3 meses)
9. **Consolidar servicios**: Reducir de ~100 a ~30 servicios con responsabilidades claras.
10. **Agregar tests**: Mínimo para Edge Functions de cálculos financieros y lógica de liquidación.
11. **Error boundaries**: Implementar para módulos críticos.
12. **Actualizar PostgreSQL** a versión con parches de seguridad.

### P3 - Largo plazo
13. **Unificar tablas de períodos** (`payroll_periods` vs `payroll_periods_real`).
14. **Documentación técnica**: El proyecto carece de documentación de arquitectura.
15. **CI/CD y linting**: Configurar pipeline con checks de seguridad automatizados.

---

## 7. RESUMEN EJECUTIVO

| Dimensión | Calificación | Nota |
|---|---|---|
| Funcionalidad | 7/10 | Completa para nómina colombiana |
| Seguridad | 3/10 | Vulnerabilidades críticas activas |
| Mantenibilidad | 4/10 | Deuda técnica alta, código duplicado masivo |
| Rendimiento | 6/10 | Sin lazy loading, console.logs excesivos |
| Testing | 2/10 | Casi sin cobertura para sistema financiero |
| Arquitectura | 6/10 | Base sólida pero erosionada por iteraciones |

**Veredicto**: El sistema tiene una base funcional sólida, pero las vulnerabilidades de seguridad deben corregirse antes de cualquier otra prioridad. La deuda técnica acumulada (100+ servicios, código muerto, duplicaciones) ralentizará significativamente el desarrollo futuro si no se aborda pronto.

