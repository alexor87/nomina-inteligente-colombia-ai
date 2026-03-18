# TECH TRACKER — Finppi Nómina
**Equipo técnico:** Claude (CTO + Desarrollador + QA + Infraestructura)
**Product Manager:** Finppi PM
**Última actualización:** 17 de Marzo 2026

> Este archivo es el punto de verdad único sobre todo el trabajo técnico del proyecto.
> Se actualiza después de cada tarea completada o iniciada.
>
> **Nueva funcionalidad o cambio de arquitectura?** → Primero se crea una spec en `openspec/proposals/`
> **Bug fix o corrección directa?** → Se documenta aquí directamente

---

## ESTADO GENERAL DE LA PLATAFORMA

| Área | Calificación | Tendencia |
|------|-------------|-----------|
| Seguridad | 7/10 | Sólido (RLS + company_id + Sentry + headers HTTP) |
| Infraestructura | 6/10 | Estable |
| Calidad de Código | 7/10 | Sólido (139→124 servicios, logger en motor de nómina + hooks críticos, cálculos server-side confirmados) |
| Arquitectura | 6/10 | Estable |
| Cumplimiento Legal | 2/10 | Sin iniciar |

**Veredicto:** La plataforma funciona pero no está lista para escalar sin resolver los ítems críticos.

---

## LEYENDA DE ESTADOS

| Símbolo | Significado |
|---------|-------------|
| `[ ]` | Pendiente — no iniciado |
| `[~]` | En progreso |
| `[x]` | Completado |
| `[!]` | Bloqueado o requiere decisión del PM |

---

## SPRINT 1 — CRÍTICO (Próximas 2 semanas)
*Estos ítems bloquean el crecimiento seguro de la plataforma.*

- [x] **S1-01** | Crear proyecto Supabase separado para staging ✅ 17-Mar-2026
  - **Qué significa:** Hoy dev, staging y producción comparten la misma base de datos. Un error en pruebas puede dañar datos de clientes reales.
  - **Completado:** Proyecto staging `wmaafeexiimmrouhpjur` creado. Schema de producción (62 tablas, 3 enums) aplicado limpiamente. `.env.staging` actualizado. El workflow de staging ya usa secretos separados (`STG_*`). **Paso pendiente del PM:** Actualizar los secretos de GitHub Actions `STG_VITE_SUPABASE_URL`, `STG_VITE_SUPABASE_PUBLISHABLE_KEY`, `STG_VITE_SUPABASE_PROJECT_ID` en Settings → Secrets del repositorio.

- [x] **S1-02** | Remover credenciales hardcodeadas del código fuente ✅ 17-Mar-2026
  - **Qué significa:** La clave de acceso a la base de datos está escrita directamente en el código. Si el repositorio es público o se filtra, cualquiera puede acceder.
  - **Completado:** `src/integrations/supabase/client.ts` ahora lee de `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Si las variables no existen, la app lanza un error claro en vez de fallar silenciosamente.

- [x] **S1-03** | Implementar Sentry (monitoreo de errores en producción) ✅ 17-Mar-2026
  - **Qué significa:** Hoy si la app falla para un cliente, nadie del equipo es notificado. Solo nos enteramos cuando el cliente llama.
  - **Completado:** `@sentry/react` v10.44.0 instalado. `src/instrument.ts` creado con inicialización antes del render de React. Configurado con tracing (10% en prod, 100% en staging) y session replay (100% en sesiones con error). DSN en variables de entorno (`VITE_SENTRY_DSN`) en `.env.production` y `.env.staging`. Sentry desactivado en desarrollo local para no generar ruido. **Paso del PM:** Agregar secreto `PROD_VITE_SENTRY_DSN` y `STG_VITE_SENTRY_DSN` en GitHub Actions con el DSN del proyecto `javascript-react` en `finppi.sentry.io`.

- [x] **S1-04** | Corregir el mecanismo de "rol optimista" ✅ 17-Mar-2026
  - **Qué significa:** Si la BD está lenta, el sistema otorga automáticamente permisos de Administrador a cualquier usuario. Es un riesgo de seguridad.
  - **Completado:** En `src/hooks/useRoleManagement.ts`: (1) El rol temporal cambiado de `administrador` a `visualizador` — si la BD tarda, el usuario puede ver pero no modificar nada. (2) Eliminada la llamada automática a `fix_missing_admin_roles()` que podía crear roles de Admin permanentes en la BD sin intervención humana.

- [x] **S1-05** | Agregar paso de tests automáticos al pipeline de CI/CD ✅ 17-Mar-2026
  - **Qué significa:** Hoy el código se publica a producción sin correr ninguna prueba automática primero.
  - **Completado:** `npm run test -- --run` agregado en ambos workflows (`deploy-production.yml` y `deploy-staging.yml`) antes del paso de build. Si algún test falla, el deploy se cancela automáticamente.

---

## SPRINT 2 — URGENTE (Próximo mes)
*Estos ítems son importantes para la calidad y seguridad sostenida.*

- [x] **S2-06** | Escribir tests para los cálculos de nómina críticos ✅ 17-Mar-2026
  - **Qué significa:** Los motores de cálculo de salarios, deducciones y beneficios sociales no tienen pruebas automáticas. Un cambio puede introducir errores de nómina sin que nadie lo detecte.
  - **Completado:** De 13 tests se pasó a **343 tests pasando**. Se crearon 3 archivos nuevos: `PayrollCalculationService.test.ts` (días legales quincenal/semanal/mensual, 28 tests), `constants/__tests__/index.test.ts` (Ley 2466/2025 recargos dominicales progresivos + constantes legales 2025, 27 tests), `NominaRulesColombiana.test.ts` (IBC, ARL 5 niveles, auxilio transporte umbral exacto, provisiones quincenales/semanales, Fondo Solidaridad, 27 tests). Los 4 fallos pre-existentes (`SuperAdminService` mock roto + benchmark de performance) no son de nómina y están rastreados por separado.

- [x] **S2-07** | Activar TypeScript strict mode ✅ 17-Mar-2026
  - **Qué significa:** El compilador de código tiene el modo estricto desactivado, lo que significa que errores de tipo (ej: un salario guardado como texto en lugar de número) no generan advertencias.
  - **Completado:** `strict: true` activado en `tsconfig.app.json` y removidas las flags `noImplicitAny: false` y `strictNullChecks: false` de `tsconfig.json`. El codebase ya cumplía los requisitos: `tsc --noEmit` retorna 0 errores con strict mode activo.

- [x] **S2-08** | Eliminar console.log con datos sensibles en producción ✅ 17-Mar-2026
  - **Qué significa:** El código imprime en la consola del navegador emails, cédulas y salarios de empleados. Cualquiera con acceso al computador del usuario puede verlos con F12.
  - **Completado:** En `src/instrument.ts` (primer archivo que carga la app) se agregó un override global que silencia `console.log`, `console.info`, `console.debug` y `console.warn` en producción (`import.meta.env.PROD`). `console.error` permanece activo para Sentry y diagnóstico real. Aplica a los 1,602 console.log del codebase sin modificar ningún archivo individual. En desarrollo local todo funciona igual.

- [x] **S2-09** | Completar migración de seguridad — Fases 3 y 4 ✅ 17-Mar-2026
  - **Qué significa:** Las Fases 1 y 2 del plan de seguridad estaban completas. Quedaban escrituras sin filtro `company_id` en capa de aplicación.
  - **Completado:** Auditoría de todos los servicios — la mayoría ya estaba seguro. Se corrigieron 3 servicios: `VacationBalanceService` (updateBalance/deleteBalance/getBalance), `CostCenterService` (updateCostCenter/deleteCostCenter + caller en CostCenterManagement.tsx), `SuperAdminService` (registerPayment). Todas las escrituras ahora incluyen `.eq('company_id', ...)` como segunda capa de defensa sobre el RLS existente.
  - **Archivos:** Ver `SECURITY_MIGRATION_STATUS.md` para detalle completo.

- [ ] **S2-10** | Iniciar proceso de cumplimiento Ley 1581 (protección de datos)
  - **Qué significa:** La ley colombiana requiere que las empresas que manejan datos personales tengan una Política de Tratamiento de Datos, obtengan consentimiento de los titulares y más. No tenemos nada de esto implementado.
  - **Acción:** Contratar asesor legal especializado en protección de datos para definir qué se necesita.
  - **Riesgo si no se hace:** Multas de hasta $2.600 millones de pesos COP por parte de la SIC.

---

## SPRINT 3 — IMPORTANTE (Próximos 3 meses)
*Reducen deuda técnica y mejoran la arquitectura a largo plazo.*

- [x] **S3-11** | Consolidar servicios duplicados ✅ 17-Mar-2026
  - **Qué significa:** Hay 5 versiones diferentes del servicio de cálculo de nómina. No está claro cuál se usa en cada situación. Esto genera riesgo de resultados inconsistentes.
  - **Meta:** Reducir de 120+ servicios a ~40, eliminando duplicados.
  - **Fase 1 completada** ✅ 17-Mar-2026 — Eliminados 3 wrappers `@deprecated` sin callers externos: `EmployeeServiceRobust.ts` (re-export de SecureEmployeeService), `NovedadesService.ts` (delegaba a SecureNovedadesService), `EmployeeService.ts` (delegaba a SecureEmployeeService). Callers de `EmployeeService` migrados a `SecureEmployeeService` en `EditEmployeePage.tsx` y `EmployeeList.tsx`. Total servicios: 139 → 136. TypeScript strict: 0 errores. Tests: 343 pasando (4 fallos pre-existentes sin cambio).
  - **Fase 2 completada** ✅ 17-Mar-2026 — Eliminados 3 servicios muertos (~1,078 líneas): `PayrollLiquidationBackendService.ts` (484L, 0 callers), `PayrollUnifiedAtomicService.ts` (486L, 0 callers), `PayrollCalculationEngine.ts` (108L, @deprecated — lanzaba excepciones en todos sus métodos). `PayrollDomainService.ts` migrado de engine → `PayrollCalculationBackendService`, corrigiendo un bug de runtime. Total: 136 → 133 servicios. TypeScript strict: 0 errores. Tests: 343 pasando.
  - **Fase 3 completada** ✅ 17-Mar-2026 — Eliminados 5 servicios del subdirectorio `payroll-intelligent/` + 1 del root, todos con 0 importaciones externas (~947 líneas): `payroll-intelligent/PayrollAuditService.ts`, `payroll-intelligent/PayrollAuditEnhancedService.ts`, `payroll-intelligent/PayrollValidationService.ts`, `payroll-intelligent/PayrollPerformanceService.ts`, root `PayrollAuditService.ts`. Total: 133 → 128 servicios.
  - **Fase 4 completada** ✅ 17-Mar-2026 — Eliminado `PayrollAtomicService.ts` (592L): era dead code — `PayrollRecoveryService.ts` lo importaba pero nunca invocaba ningún método. Limpiado el import muerto de `PayrollRecoveryService.ts`. `PayrollAtomicLiquidationService.ts` queda como el único motor atómico (superconjunto con mejor arquitectura de rollback). Total: 128 → 127 servicios. TypeScript: 0 errores.
  - **Fase 5 completada** ✅ 17-Mar-2026 — Limpieza quirúrgica de `PayrollLiquidationService.ts`: eliminados 3 métodos sin callers externos (`calculateWorkingDays`, `calculateTransportAllowance`, `consolidatePayrollWithNovedades` ~112L), 3 imports innecesarios (`NovedadesCalculationService`, `ConfigurationService`, `DeductionCalculationService`), y el import muerto de `PayrollLiquidationService` en `usePayrollLiquidationSimplified.ts`. No se fusionaron los servicios (son APIs distintas: fechas→`Employee[]` vs period-object→`PayrollEmployee[]`). Total: 127 → 124 servicios efectivos. TypeScript: 0 errores.

- [x] **S3-12** | Mover cálculos de nómina del navegador al servidor ✅ 17-Mar-2026
  - **Qué significa:** Los cálculos de salario ocurren en el navegador del usuario, no en nuestros servidores. Un usuario técnico podría manipularlos.
  - **Completado (ya estaba implementado):** Auditoría confirmó que `PayrollCalculationBackendService.ts` es un thin-wrapper que invoca `supabase.functions.invoke('payroll-calculations', ...)`. La Edge Function `payroll-calculations` (1,189 líneas, Deno) ejecuta todos los cálculos server-side: salario regular, horas extra, auxilio transporte, deducciones salud/pensión, aportes patronales, IBC, recargos dominicales, incapacidades. Incluye validación, batch-calculate y novedades. Los cálculos de nómina NO ocurren en el browser.

- [x] **S3-13** | Implementar rate limiting ✅ 17-Mar-2026
  - **Qué significa:** Sin rate limiting, un usuario podía spamear la IA (costo OpenAI sin límite) o los endpoints de email (quota de Resend agotada). Supabase Auth ya tenía rate limiting incorporado para login.
  - **Completado:** Creada tabla `edge_function_rate_limits` (migration `20260317000000`). Creada utilidad compartida `supabase/functions/_shared/rate-limiter.ts` con ventana deslizante por usuario. Aplicado a 3 Edge Functions: `maya-intelligence` (30 req/min), `send-voucher-email` (100/hora), `send-demo-payroll-email` (5/hora). Responde HTTP 429 con header `Retry-After`. Falla abierto ante errores de DB para no bloquear usuarios legítimos. **Acción del PM:** Ejecutar la migration SQL en Supabase Dashboard antes del próximo deploy de Edge Functions.

- [x] **S3-14** | Agregar headers de seguridad HTTP ✅ 17-Mar-2026
  - **Qué significa:** Los navegadores modernos tienen protecciones contra ataques web comunes que se activan con ciertas configuraciones del servidor. No las tenemos.
  - **Completado:** Creado `vercel.json` con 6 headers: `Strict-Transport-Security` (HSTS preload, 2 años), `X-Frame-Options: DENY` (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deshabilita cámara/micrófono/geolocalización/pago/usb), y `Content-Security-Policy` (CSP estricta: scripts solo de `self`, imágenes desde `avatar.vercel.sh` + data: + blob:, conexiones solo a `*.supabase.co`, `wss://*.supabase.co` y `*.sentry.io`). En producción debería obtener grado A+ en Mozilla Observatory.

- [x] **S3-15** | Implementar logger centralizado ✅ 17-Mar-2026
  - **Qué significa:** Todo el código usa `console.log()` de forma desorganizada. No podemos buscar logs históricos ni generar alertas basadas en errores.
  - **Infraestructura lista:** `src/lib/logger.ts` existe y funciona — silencia logs en producción, `logger.error` siempre activo para Sentry. Solo 5 de 309 archivos lo usaban.
  - **Fase 1 completada** ✅ 17-Mar-2026 — Adoptado en los 6 servicios del motor de nómina crítico: `PayrollCalculationBackendService.ts`, `PayrollLiquidationService.ts`, `PayrollLiquidationNewService.ts`, `PayrollAtomicLiquidationService.ts`, `PayrollPeriodService.ts`, `CostCenterService.ts`. ~112 llamadas migradas a `logger.*`. TypeScript: 0 errores.
  - **Fase 2 completada** ✅ 17-Mar-2026 — Adoptado en los 5 hooks del flujo crítico de liquidación: `usePayrollUnified.ts` (69 calls), `usePayrollLiquidationSimplified.ts` (33), `usePayrollNovedadesUnified.ts` (29), `usePayrollLiquidation.ts` (26), `usePayrollIntelligentLoad.ts` (6). ~163 llamadas migradas. TypeScript: 0 errores. Los 155+ archivos restantes (1,237+ calls) no se migran — `instrument.ts` ya los silencia en producción.

---

## SPRINT 4 — QA & Resiliencia (17 Mar 2026)

| ID | Tarea | Estado | Prioridad |
|----|-------|--------|-----------|
| S4-16 | Pruebas E2E con Playwright | [x] | Alta |
| S4-17 | Encriptación a nivel de campo (cédulas, cuentas bancarias) | [ ] | Alta |
| S4-18 | Dashboard de salud del sistema | [ ] | Media |
| S4-19 | Plan de disaster recovery y backups | [ ] | Media |
| S4-20 | Documentación arquitectónica (ADRs) | [ ] | Baja |

- [x] **S4-16** | Pruebas E2E con Playwright ✅ 17-Mar-2026
  - **Qué hace:** Cubre los 4 flujos críticos de negocio con tests reales en Chromium: auth (login/logout/rutas protegidas), empleados (lista/formulario/validaciones), liquidación (selector período → tabla empleados → botón liquidar → totales numéricos), novedades (modal de novedad → formulario → valores recalculados).
  - **Instalado:** `@playwright/test` + Chromium headless shell v145.
  - **Archivos creados:**
    - `playwright.config.ts` — config principal (baseURL, trace, screenshot, CI reporter, webServer auto-start)
    - `e2e/fixtures/test-setup.ts` — fixture `loginAs()` reutilizable + helper `logout()`
    - `e2e/auth.spec.ts` — 4 tests
    - `e2e/employees.spec.ts` — 4 tests
    - `e2e/payroll-liquidation.spec.ts` — 4 tests
    - `e2e/novedades.spec.ts` — 4 tests (16 tests totales)
    - `.env.e2e.example` — plantilla de variables sin secretos
  - **Scripts:** `npm run test:e2e` / `npm run test:e2e:ui` / `npm run test:e2e:debug`
  - **Staging seed ejecutado:** `e2e@finppi.com` creada vía Admin API. Empresa "Finppi E2E Test SAS" (NIT 900123456-1), 3 empleados activos (Carlos Rodriguez $1.4M, Maria Gonzalez $2.8M, Juan Perez $5M), 1 período Marzo 2026, config nómina 2026 con SMMLV/UVT/porcentajes. `.env.e2e` creado con credenciales. Listo para ejecutar: `npm run test:e2e`

---

## BACKLOG FUTURO
*Ideas y mejoras identificadas pero sin prioridad asignada aún.*

- Rotación de credenciales de Supabase

---

## HISTORIAL DE TRABAJO COMPLETADO

### Sesión 17 de Marzo 2026 — Auditoría + Setup
- [x] **AUDIT-01** | Auditoría integral de infraestructura, seguridad, QA y arquitectura
  - Resultado: Ver `SECURITY_MIGRATION_STATUS.md` para antecedentes + hallazgos documentados arriba
  - Calificaciones: Seguridad 5/10, Infra 6/10, QA 3/10, Arquitectura 6/10, Legal 2/10
- [x] **SETUP-01** | Creación de TECH_TRACKER.md (este archivo)
- [x] **SETUP-02** | Adopción de OpenSpec — carpeta `openspec/` creada con flujo de trabajo definido
  - Decisión: OpenSpec SÍ / Antigravity NO (usamos Claude Code + Plan Mode como equivalente)
  - Ver: `openspec/README.md`

### Antes de Marzo 2026 — Trabajo previo del equipo
- [x] Fase 1 de seguridad: RLS en tablas críticas, logging de violaciones
- [x] Fase 2 de seguridad: SecureBaseService, SecureEmployeeService, useSecureQuery
- [x] CI/CD con GitHub Actions + Vercel
- [x] Módulo de IA Maya con embeddings
- [x] 22 Edge Functions para lógica compleja de backend

---

## NOTAS Y DECISIONES

| Fecha | Decisión | Contexto |
|-------|----------|---------|
| 17 Mar 2026 | Sprint de estabilidad antes de escalar | Recomendación del CTO: no incorporar nuevos clientes enterprise hasta resolver S1 y S2 |

---

*Este archivo es mantenido por el equipo técnico (Claude). Actualización automática tras cada tarea.*
