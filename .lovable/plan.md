

# Estado del Plan de Remediación CTO

## Completado

| Item | Estado |
|---|---|
| P0: RLS `processed_commands`, `session_states` | Migración creada |
| P0: Escalación privilegios `user_roles` | Migración creada |
| P0: Inserts abiertos (`employee_identity_ledger`, etc.) | Migración creada |
| P1: Lazy loading en `App.tsx` | Implementado |
| P1: `ErrorBoundary` global | Creado |
| P1: `logger.ts` wrapper | Creado |
| P1: Eliminar páginas muertas (~15 archivos) | Eliminados |

## Pendiente

### P1 - Corto plazo (quedan 3 items)

**1. Migrar console.logs al logger (7,800+ en 242 archivos)**
- Se creó `src/lib/logger.ts` pero **ningún archivo lo importa**. Cero adopción.
- Priorizar archivos críticos: services/, hooks/, contexts/ (datos sensibles en logs).
- Alcance realista en esta iteración: migrar los ~20 archivos más críticos (servicios de nómina, empleados, prestaciones sociales).

**2. Eliminar servicios muertos/redundantes (~30+ archivos removibles)**
Aún hay ~105 archivos en `src/services/`. Candidatos claros para eliminar:
- `CriticalRepairService.ts`, `DemoDataCleanupService.ts`, `CompanyTestingService.ts` — utilidades de debugging
- `PayrollSimulator.ts` — ejemplo/simulador
- `PayrollCleanupService.ts`, `PayrollPeriodCleanupService.ts` — utilidades one-off
- `PayrollHistoricalRecoveryService.ts`, `PayrollRecoveryService.ts`, `PeriodRepairService.ts` — herramientas de reparación
- `NovedadesBackupService.ts` — backup del servicio original
- `ProactiveDetectionService.ts`, `RealtimeService.ts` — posiblemente sin uso
- `PayrollRollbackService.ts`, `PayrollConsistencyService.ts` — herramientas de mantenimiento
- Wrappers deprecated: `EmployeeService.ts`, `NovedadesService.ts`, `PayrollUnifiedService.ts`

**3. Configurar `search_path` en 12 funciones SQL**
- Requiere identificar las funciones afectadas y crear migración.

### P2 - Mediano plazo

**4. Consolidar servicios (~100 → ~30)**
- Employee: 10+ servicios → 3 (CRUD, Validation, Export)
- Payroll: 25+ servicios → 5-6 (Domain, Calculation, Liquidation, History, Voucher, Audit)
- Novedades: 6 servicios → 2 (CRUD, Calculation)
- Reports: 5 servicios → 2 (Data, Export)

**5. Tests para lógica financiera crítica**
- Edge Functions: `payroll-calculations`, `liquidate-social-benefit`, `calculate-social-benefits`
- Hooks: `useNovedadBackendCalculation`, `useSocialBenefitLiquidation`

**6. Unificar `payroll_periods` y `payroll_periods_real`**

### P3 - Largo plazo
**7. Documentación técnica de arquitectura**
**8. CI/CD con checks de seguridad**

---

## Propuesta para esta iteración

Abordar los 3 items P1 pendientes:

1. **Migrar console.logs** en los 20 archivos más críticos (reemplazar `console.log` → `logger.log`, `console.warn` → `logger.warn`)
2. **Eliminar ~15 servicios muertos** que no se importan en ningún lado
3. **Crear migración SQL** para `search_path` en funciones vulnerables

Esto llevaría la seguridad de 3/10 a ~6/10 y la mantenibilidad de 4/10 a ~5.5/10.

