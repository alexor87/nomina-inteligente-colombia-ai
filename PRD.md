# PRD — NóminaInteligente Colombia AI

> **Documento generado automáticamente** basado en el análisis del codebase actual.  
> Última actualización: 2026-03-09

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Módulos Funcionales](#4-módulos-funcionales)
5. [Maya — Asistente IA](#5-maya--asistente-ia)
6. [Servicios Backend (Edge Functions)](#6-servicios-backend-edge-functions)
7. [Capa de Servicios Frontend](#7-capa-de-servicios-frontend)
8. [Modelo de Seguridad](#8-modelo-de-seguridad)
9. [Sistema de Reportes](#9-sistema-de-reportes)
10. [Configuración y Personalización](#10-configuración-y-personalización)
11. [Testing](#11-testing)
12. [Roadmap Inferido](#12-roadmap-inferido)

---

## 1. Visión General

**NóminaInteligente Colombia AI** es una plataforma SaaS de gestión de nómina diseñada específicamente para empresas colombianas. Integra un asistente de inteligencia artificial llamado **Maya** que guía a los usuarios en procesos de liquidación, genera reportes, detecta anomalías proactivamente y responde consultas de legislación laboral colombiana.

### Propuesta de Valor

- **Cumplimiento legal colombiano**: Cálculos basados en legislación vigente (Código Sustantivo del Trabajo, DIAN, UGPP).
- **Asistente IA integrado**: Maya acompaña cada módulo con sugerencias contextuales, simulaciones what-if y detección proactiva de errores.
- **Multi-empresa con aislamiento de datos**: Cada empresa opera en un contexto seguro con Row-Level Security (RLS).
- **Automatización end-to-end**: Desde creación de empleados hasta generación de comprobantes PDF y envío por email.

### Usuarios Objetivo

| Rol | Descripción |
|-----|-------------|
| **Administrador de empresa** | Gestiona empleados, ejecuta liquidaciones, configura la empresa |
| **Contador** | Accede a reportes, exportaciones contables, mapeo PUC |
| **Super Admin (SaaS)** | Gestiona todas las empresas del sistema |

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilos** | Tailwind CSS + shadcn/ui (Radix primitives) |
| **Estado global** | Zustand |
| **Estado servidor** | TanStack React Query v5 |
| **Routing** | React Router v6 |
| **Animaciones** | Framer Motion |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions + Storage + Realtime) |
| **IA** | OpenAI GPT-4o vía Edge Functions + Embeddings pgvector |
| **Testing** | Vitest + Testing Library |
| **Exportación** | jsPDF + jspdf-autotable + xlsx |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │  Pages   │ │Components│ │  Hooks   │ │  Contexts  │ │
│  │ (22 pgs) │ │ (25 dirs)│ │ (80+)    │ │ (5 ctx)    │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼─────┐ │
│  │              Services Layer (100+ services)         │ │
│  │         SecureBaseService (base con RLS)            │ │
│  └────────────────────┬───────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND                       │
│                                                          │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Auth     │ │  PostgreSQL  │ │   Edge Functions    │  │
│  │ (email + │ │  (30+ tables │ │   (22 functions)    │  │
│  │  magic)  │ │   + RLS)     │ │                     │  │
│  └──────────┘ └──────────────┘ └─────────────────────┘  │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Storage  │ │  Realtime    │ │  pgvector           │  │
│  │ (logos,  │ │ (suscripcio- │ │ (knowledge base     │  │
│  │ vouchers)│ │  nes live)   │ │  embeddings)        │  │
│  └──────────┘ └──────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Contextos de React

| Contexto | Responsabilidad |
|----------|-----------------|
| `AuthContext` | Autenticación, roles, permisos por módulo, `hasModuleAccess()` |
| `SubscriptionContext` | Plan activo, límites de empleados/períodos, trial |
| `YearContext` | Año fiscal seleccionado (filtro transversal) |
| `PayrollEditContext` | Estado de edición de nómina activa |
| `UnifiedPeriodEditContext` | Contexto de período en edición unificada |

---

## 4. Módulos Funcionales

### 4.1 Autenticación y Onboarding

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | LoginPage | Login con email/password |
| `/register` | RegisterPage | Registro de usuario |
| `/register/company` | CompanyRegistrationPage | Registro de empresa (NIT, razón social, actividad económica) |
| `/reset-password` | ResetPasswordPage | Recuperación de contraseña |
| `/logout` | LogoutPage | Cierre de sesión |

**Funcionalidades:**
- Registro multi-paso: usuario → empresa → configuración inicial
- Asignación automática de roles (`AutoRoleAssignmentService`)
- Creación de suscripción por defecto (trial)
- Onboarding guiado por Maya con demo de liquidación

### 4.2 Dashboard

**Ruta:** `/modules/dashboard`

**Funcionalidades:**
- Métricas KPI: total empleados, costo nómina, períodos pendientes
- Gráficos de tendencias (Recharts)
- Feed de actividad reciente (`dashboard_activity`)
- Alertas del sistema (`dashboard_alerts`) con prioridad y acciones
- Accesos rápidos a módulos frecuentes
- Detección de períodos pendientes de cierre

**Servicios:** `DashboardService`, `useDashboard`

### 4.3 Gestión de Empleados

**Rutas:** `/modules/employees`, `/modules/employees/create`, `/modules/employees/:id/edit`

**Funcionalidades:**
- **CRUD completo** con wizard multi-paso para creación
- **Importación masiva** desde Excel con mapeo de columnas (`NoveltyImportService`)
- **Exportación Excel** de lista de empleados (`EmployeeExcelExportService`)
- **Filtros avanzados**: por estado, departamento, tipo contrato, rango salarial
- **Selección bulk** con acciones masivas
- **Soft delete** con auditoría (`EmployeeSoftDeleteService`)
- **Campos personalizados** por empresa (`company_field_definitions`)
- **Validación robusta**: cédula, email, fechas, salario mínimo
- **Notas por empleado** con menciones a otros usuarios (`employee_notes`, `employee_note_mentions`)
- **Ledger de identidad** para trazabilidad de cambios (`employee_identity_ledger`)

**Campos del empleado:**
- Datos personales: nombre, apellido, cédula, tipo documento, fecha nacimiento, sexo, dirección, ciudad, departamento
- Datos laborales: cargo, fecha ingreso, tipo contrato, tipo salario, salario base, jornada, periodicidad pago
- Seguridad social: EPS, AFP, ARL (nivel riesgo), caja compensación
- Datos bancarios: banco, tipo cuenta, número cuenta, titular
- Tipo/subtipo cotizante (tabla maestra)
- Centro de costos, sucursal

**Servicios principales:** `EmployeeService`, `EmployeeCRUDService`, `EmployeeUnifiedService`, `SecureEmployeeService`, `EmployeeValidationService`, `EmployeeCompositionService`

### 4.4 Liquidación de Nómina

**Ruta:** `/modules/payroll`

**Funcionalidades:**
- **Selección inteligente de período**: detección automática del siguiente período a liquidar
- **Carga de empleados activos** con sus datos de seguridad social
- **Gestión de novedades** (30+ tipos):
  - Horas extra (diurnas, nocturnas, dominicales, festivas)
  - Recargos nocturnos y dominicales
  - Incapacidades (enfermedad general, laboral, maternidad, paternidad)
  - Vacaciones (disfrutadas, compensadas)
  - Licencias (remuneradas, no remuneradas, luto, matrimonio)
  - Bonificaciones, comisiones, auxilios
  - Deducciones (libranzas, embargos, préstamos)
- **Cálculo backend atómico** vía Edge Function (`payroll-liquidation-atomic`)
- **Auto-guardado** de novedades (`PayrollAutoSaveService`)
- **Validación exhaustiva** pre-liquidación (`PayrollExhaustiveValidationService`)
- **Versionamiento de períodos**: snapshot de cada liquidación
- **Rollback**: capacidad de revertir a versiones anteriores
- **Reapertura de períodos cerrados** con auditoría (`payroll_reopen_audit`)
- **Recálculo de IBC** post-liquidación (`payroll-recalc-ibc`)
- **Generación de comprobantes PDF** (`generate-voucher-pdf`)
- **Envío de comprobantes por email** (`send-voucher-email`)
- **Envío bulk** de comprobantes (`VoucherBulkSendService`)

**Cálculos incluidos:**
- Salario proporcional (días trabajados)
- Auxilio de transporte (< 2 SMLMV)
- Aportes empleado: salud (4%), pensión (4%)
- Aportes empleador: salud (8.5%), pensión (12%), ARL (variable), SENA (2%), ICBF (3%), caja (4%)
- Fondo de solidaridad pensional (> 4 SMLMV)
- Retención en la fuente (tabla UVT)
- IBC (Ingreso Base de Cotización)

**Servicios principales:** `PayrollAtomicLiquidationService`, `PayrollCalculationEngine`, `PayrollLiquidationService`, `NovedadesService`, `PayrollVersionService`, `PayrollRollbackService`

### 4.5 Historial de Nómina

**Rutas:** `/modules/payroll-history`, `/modules/payroll-history/:periodId`

**Funcionalidades:**
- Lista de todos los períodos liquidados con totales
- Detalle por período: desglose por empleado
- Comparación entre versiones de un período
- Correcciones post-cierre (`PayrollPeriodCleanupService`)
- Ajustes pendientes entre períodos (`PendingAdjustmentsService`)
- Reliquidación de ajustes (`reliquidate-period-adjustments`)
- Vista de auditoría de cambios

**Servicios:** `PayrollHistoryService`, `PeriodVersionComparisonService`, `ClosedPeriodAdjustmentService`

### 4.6 Prestaciones Sociales

**Rutas:** `/modules/prestaciones-sociales`, `/modules/prestaciones-sociales/liquidar/:benefitType/:periodKey`

**Funcionalidades:**
- **Cesantías**: Cálculo anual (feb) y parciales, con base promedio salarial
- **Intereses sobre cesantías**: 12% anual proporcional
- **Prima de servicios**: Junio y diciembre, 30 días por año
- **Provisión mensual automática** (`provision-social-benefits`): acumulación mensual proporcional
- **Consolidación de provisiones**: vista de provisiones acumuladas vs. pagadas
- **Liquidación individual** por tipo y período (`liquidate-social-benefit`)
- **Anulación** de liquidaciones con justificación (`anular-social-benefit`)
- **Exportación** de liquidaciones

**Servicios:** `SocialBenefitsService`, `SocialBenefitsLiquidationService`, `ProvisionsService`, `SocialBenefitsExportService`

### 4.7 Vacaciones y Ausencias

**Ruta:** `/modules/vacations-absences`

**Funcionalidades:**
- **Balance de vacaciones** por empleado: días acumulados, disfrutados, pendientes
- **Registro de vacaciones**: disfrutadas y compensadas en dinero
- **Ausencias multi-período**: ausencias que cruzan límites de período (`MultiPeriodAbsenceService`)
- **Detección de conflictos**: solapamiento de fechas, balance insuficiente (`useVacationConflictDetection`)
- **Integración con nómina**: las vacaciones generan novedades automáticas en el período correspondiente
- **Sincronización** vacación↔novedad (`VacationNovedadSyncService`)

**Servicios:** `VacationBalanceService`, `MultiPeriodAbsenceService`, `VacationNovedadSyncService`

### 4.8 Configuración

**Ruta:** `/modules/settings` — 10+ tabs de configuración

| Tab | Componente | Funcionalidad |
|-----|-----------|---------------|
| Empresa | `EmpresaSettings` | Razón social, NIT, dirección, logo, representante legal |
| Empleados | `EmpleadosSettings` | Campos personalizados, valores por defecto |
| Aportes | `AportesSettings` | Porcentajes de seguridad social, configuración ARL |
| Parámetros Legales | `ParametrosLegalesSettings` | SMLMV, UVT, auxilio transporte por año |
| Contrato y Nómina | `ContratoNominaSettings` | Tipos de contrato, periodicidad por defecto |
| Nómina Electrónica | `NominaElectronicaSettings` | Configuración DIAN (preparación) |
| Políticas de Nómina | `PayrollPoliciesSettings` | Modo IBC, política incapacidades, políticas de novedades |
| Usuarios y Roles | `UsuariosRolesSettings` | Gestión de roles, permisos por módulo |
| Notificaciones | `NotificacionesSettings` | Alertas, umbrales, canales de notificación |
| Integraciones | `IntegracionesSettings` | Software contable, mapeo PUC personalizado |
| Sucursales | `BranchManagement` | CRUD de sucursales con código, ciudad, responsable |
| Centros de Costo | `CostCenterManagement` | CRUD de centros de costo |
| Facturación | `FacturacionPlanSettings` | Plan actual, uso, límites, upgrade |

### 4.9 Perfil de Usuario

**Ruta:** `/modules/profile`

- Datos personales del usuario
- Cambio de contraseña
- Preferencias de notificación

---

## 5. Maya — Asistente IA

Maya es el asistente de inteligencia artificial integrado en toda la plataforma. Opera en dos modos:

### 5.1 Modos de Interacción

| Modo | Descripción |
|------|-------------|
| **Floating Assistant** | Widget flotante disponible en todas las páginas, contextual al módulo actual |
| **Full Page** | Página dedicada (`/maya`) con historial de conversaciones y flujos guiados |

### 5.2 Flujos Guiados (`GuidedFlow`)

| Flujo | Archivo | Descripción |
|-------|---------|-------------|
| Crear Empleado | `employeeManagementFlow.ts` | Wizard conversacional para registrar empleados paso a paso |
| Calcular Nómina | `payrollCalculationFlow.ts` | Guía para seleccionar período y ejecutar liquidación |
| Generar Reportes | `reportsGenerationFlow.ts` | Selección de tipo de reporte y parámetros |
| Simulación What-If | `whatIfSimulationFlow.ts` | Simular escenarios: "¿qué pasa si subo salarios un 10%?" |
| Detección Proactiva | `proactiveDetectionFlow.ts` | Escaneo automático de anomalías en datos de nómina |
| Onboarding Demo | `onboardingDemoFlow.ts` | Demo guiada de liquidación para nuevos usuarios |
| Onboarding Completo | `onboardingCompleteFlow.ts` | Flujo completo de configuración inicial |

### 5.3 Capacidades de IA

- **Consultas KISS**: Preguntas en lenguaje natural sobre legislación laboral colombiana
- **RAG (Retrieval Augmented Generation)**: Base de conocimiento legal con embeddings pgvector (`legal_knowledge_base`)
- **Simulador What-If**: Proyecciones de costo ante cambios salariales, nuevos empleados, etc.
- **Detección proactiva**: Identificación automática de inconsistencias (empleados sin EPS, salarios bajo mínimo, períodos sin cerrar)
- **Acciones ejecutables**: Maya puede ejecutar acciones reales (crear empleado, iniciar liquidación) vía `execute-maya-action`
- **Insights de reportes**: Análisis automático de datos de nómina con recomendaciones (`ReportInsightAnalyzer`)

### 5.4 Arquitectura Maya

```
┌─────────────────────────────────────┐
│          MayaProvider (Context)      │
│  ┌─────────────────────────────┐    │
│  │    MayaEngine (Orquestador) │    │
│  │  ┌───────────┐ ┌─────────┐ │    │
│  │  │ ChatSvc   │ │ FlowMgr │ │    │
│  │  └───────────┘ └─────────┘ │    │
│  │  ┌───────────┐ ┌─────────┐ │    │
│  │  │ ReportSvc │ │ QuerySvc│ │    │
│  │  └───────────┘ └─────────┘ │    │
│  └─────────────────────────────┘    │
│                                      │
│  MayaFloatingAssistant (widget)      │
│  MayaIntegratedComponent (page)      │
│  MayaGlobalManager (lifecycle)       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Supabase Edge Functions            │
│  ┌──────────────────┐               │
│  │ maya-intelligence │──► OpenAI    │
│  │ (RAG + GPT-4o)   │    API       │
│  └──────────────────┘               │
│  ┌──────────────────┐               │
│  │ execute-maya-     │──► DB        │
│  │ action            │   mutations  │
│  └──────────────────┘               │
│  ┌──────────────────┐               │
│  │ generate-        │──► pgvector   │
│  │ embedding        │              │
│  └──────────────────┘               │
└─────────────────────────────────────┘
```

### 5.5 Persistencia de Conversaciones

- **`maya_conversations`**: Historial de conversaciones por usuario y empresa
- **`maya_messages`**: Mensajes individuales con rol (user/assistant) y metadata
- **`conversation_events`**: Telemetría de eventos de flujo (transiciones, errores)

---

## 6. Servicios Backend (Edge Functions)

22 Edge Functions desplegadas en Supabase:

| Función | JWT | Descripción |
|---------|-----|-------------|
| `maya-intelligence` | ✅ | Motor RAG: consulta knowledge base + OpenAI para respuestas contextuales |
| `execute-maya-action` | ✅ | Ejecuta acciones de Maya (crear empleado, iniciar liquidación) |
| `maya-diagnostics` | — | Diagnósticos internos del sistema Maya |
| `payroll-liquidation-atomic` | ✅ | Liquidación atómica de nómina (transacción completa) |
| `payroll-calculations` | ✅ | Cálculos individuales de nómina por empleado |
| `payroll-recalc-ibc` | ✅ | Recálculo de IBC post-liquidación |
| `reliquidate-period-adjustments` | ✅ | Reliquidación con ajustes de períodos anteriores |
| `rollback-payroll-version` | — | Revertir a versión anterior de liquidación |
| `calculate-social-benefits` | ✅ | Cálculo de prestaciones sociales |
| `liquidate-social-benefit` | ✅ | Liquidación individual de prestación social |
| `anular-social-benefit` | ✅ | Anulación de prestación liquidada |
| `provision-social-benefits` | ✅ | Provisión mensual automática de prestaciones |
| `generate-voucher-pdf` | ✅ | Generación de comprobante de nómina en PDF |
| `send-voucher-email` | ✅ | Envío de comprobante por email al empleado |
| `send-demo-payroll-email` | ❌ | Email de demo para onboarding |
| `generate-embedding` | ❌ | Genera embedding vectorial para un documento |
| `process-embedding-queue` | ❌ | Procesa cola de embeddings pendientes |
| `populate-knowledge-embeddings` | ❌ | Carga masiva de embeddings de conocimiento legal |
| `accounting-sync` | ✅ | Sincronización con software contable externo |
| `migrate-ibc-snapshots` | ✅ | Migración de snapshots de IBC |
| `fix_malformed_fragmented_absences` | — | Corrección de ausencias fragmentadas |

---

## 7. Capa de Servicios Frontend

### 7.1 Base de Seguridad

`SecureBaseService` es la clase base abstracta que garantiza aislamiento multi-empresa:

- `getCurrentUserCompanyId()` — obtiene company_id del usuario autenticado
- `secureQuery()` — SELECT con filtro automático `company_id`
- `secureInsert()` — INSERT con inyección automática de `company_id`
- `secureUpdate()` — UPDATE con validación de `company_id`
- `secureDelete()` — DELETE con validación de `company_id`
- `validateCompanyAccess()` — validación cruzada de acceso
- `logSecurityViolation()` — registro de intentos de acceso no autorizado

### 7.2 Servicios por Dominio

| Dominio | Servicios Principales |
|---------|----------------------|
| **Empleados** | `EmployeeService`, `EmployeeCRUDService`, `EmployeeUnifiedService`, `SecureEmployeeService`, `EmployeeValidationService`, `EmployeeSoftDeleteService`, `EmployeeExcelExportService`, `EmployeeNotesService` |
| **Nómina** | `PayrollAtomicLiquidationService`, `PayrollCalculationEngine`, `PayrollService`, `NovedadesService`, `SecureNovedadesService`, `PayrollVersionService`, `PayrollRollbackService`, `PayrollAutoSaveService`, `PayrollAuditService` |
| **Prestaciones** | `SocialBenefitsService`, `SocialBenefitsLiquidationService`, `ProvisionsService`, `SocialBenefitsExportService` |
| **Vacaciones** | `VacationBalanceService`, `MultiPeriodAbsenceService`, `VacationNovedadSyncService` |
| **Reportes** | `ReportsDBService`, `ReportsDataService`, `ReportsExportService`, `ReportsFilterService`, `ReportsMetricsService`, `ReportInsightAnalyzer` |
| **Contabilidad** | `AccountingMappingService`, `AccountingIntegrationService` |
| **Empresa** | `CompanyService`, `CompanyManagementService`, `CompanyRegistrationService`, `CompanySettingsService`, `CompanyConfigurationService`, `CompanyPayrollPoliciesService` |
| **Dashboard** | `DashboardService` |
| **Maya** | `MayaChatService`, `MayaConversationManager`, `MayaQueryService`, `GuidedFlowManager`, `MayaReportService`, `MayaIntelligentValidationService` |
| **Infraestructura** | `SecureBaseService`, `RealtimeService`, `PDFExportService`, `ExcelExportService`, `ConfigurationService` |

---

## 8. Modelo de Seguridad

### 8.1 Autenticación

- Supabase Auth con email/password
- Magic link para recuperación
- Sesiones JWT con refresh automático
- Timeout por inactividad (`useInactivityTimeout`)

### 8.2 Autorización

- **Roles en tabla separada** (`user_roles`): `admin`, `moderator`, `user`
- **Función `has_role()`**: Security Definer para evitar recursión RLS
- **Permisos por módulo**: `hasModuleAccess()` en AuthContext
- **Navegación filtrada**: Los módulos se muestran según permisos del rol

### 8.3 Aislamiento Multi-Empresa

- **RLS en todas las tablas**: Cada tabla con `company_id` + policies
- **SecureBaseService**: Inyección automática de `company_id` en queries
- **Validación cruzada**: `validateCompanyAccess()` para recursos compartidos
- **Logging de violaciones**: Registro de intentos de acceso cross-company

### 8.4 Suscripciones

- **`company_subscriptions`**: Plan, límites, trial, fechas
- **`SubscriptionContext`**: Verificación de límites en frontend
- **Planes**: free/trial → basic → professional → enterprise

---

## 9. Sistema de Reportes

6 tipos de reportes especializados:

| Reporte | Componente | Descripción |
|---------|-----------|-------------|
| **Resumen de Nómina** | `PayrollSummaryReport` | Totales por período: devengado, deducciones, neto, por empleado |
| **Costos Laborales** | `LaborCostReport` | Costo total empleador: salarios + aportes + prestaciones |
| **Seguridad Social** | `SocialSecurityReport` | Aportes a salud, pensión, ARL, cajas, SENA, ICBF |
| **Historial de Novedades** | `NoveltyHistoryReport` | Todas las novedades registradas con filtros por tipo/período |
| **Retención en la Fuente** | `IncomeRetentionReport` | Cálculos de retención por empleado según tabla UVT |
| **Exportación Contable** | `AccountingExportReport` | Causaciones contables con mapeo PUC personalizable |

### Funcionalidades Transversales

- **Filtros guardados** (`SavedFiltersBar`): Guardar y reutilizar combinaciones de filtros
- **Exportación**: PDF y Excel para todos los reportes
- **Insights IA**: Maya analiza los datos del reporte y genera recomendaciones
- **Filtros avanzados**: Por período, empleado, departamento, rango de fechas, tipo novedad

---

## 10. Configuración y Personalización

### 10.1 Parámetros Legales por Año

Tabla `company_payroll_configurations`:
- SMLMV (Salario Mínimo Legal Mensual Vigente)
- UVT (Unidad de Valor Tributario)
- Auxilio de transporte
- Porcentajes de aportes (salud, pensión, ARL por nivel de riesgo)
- Fondo de solidaridad pensional (rangos salariales)

### 10.2 Políticas de Nómina

Tabla `company_payroll_policies`:
- **Modo IBC**: estándar o personalizado
- **Política de incapacidades**: cómo calcular el pago patronal vs. EPS/ARL
- **Políticas de novedades**: reglas por tipo de novedad

### 10.3 Mapeo Contable PUC

Tabla `accounting_account_mappings`:
- Mapeo personalizable de conceptos de nómina a cuentas PUC
- Diferenciación débito/crédito por concepto
- Exportación según plan contable de la empresa

### 10.4 Campos Personalizados

Tabla `company_field_definitions`:
- Campos custom por empresa para empleados
- Tipos: text, number, date, select, boolean
- Versionamiento de schema (`company_schema_versions`)

### 10.5 Sucursales y Centros de Costo

- **Sucursales** (`branches`): Código, nombre, ciudad, departamento, responsable
- **Centros de costo** (`cost_centers`): Código, nombre, descripción

---

## 11. Testing

### Framework

- **Vitest** + **Testing Library** + **jsdom**

### Tests Existentes

| Archivo | Cobertura |
|---------|-----------|
| `AccountingMappingService.test.ts` | Mapeo PUC |
| `MayaProvider.test.tsx` | Contexto Maya |
| `PUCMappingEditor.test.tsx` | Editor de mapeo contable |
| `use-ui-block-detector.test.ts` | Detección de bloqueos UI |
| `src/services/__tests__/` | Tests de servicios de nómina |
| `src/components/settings/__tests__/` | Tests de configuración |

---

## 12. Roadmap Inferido

Basado en componentes y configuraciones existentes que sugieren desarrollo futuro:

### En Preparación

| Feature | Evidencia | Estado |
|---------|-----------|--------|
| **Nómina Electrónica DIAN** | `NominaElectronicaSettings.tsx` existe como tab de configuración | 🟡 UI lista, backend pendiente |
| **Integraciones Contables** | `AccountingIntegrationService`, `accounting-sync` Edge Function, `AccountingSoftwareWizard` | 🟡 Parcialmente implementado |
| **Notificaciones Avanzadas** | `NotificacionesSettings.tsx`, alertas en dashboard | 🟡 Configuración lista |

### Posibles Extensiones

| Feature | Justificación |
|---------|---------------|
| **App Móvil / PWA** | Layout responsive ya implementado, `use-mobile.tsx` para detección |
| **Multi-idioma** | Actualmente solo español; estructura permite i18n |
| **API pública** | Edge Functions ya exponen endpoints RESTful |
| **Reportes UGPP** | Base de datos de aportes ya estructura para generación automática |
| **Firma digital de comprobantes** | Storage + PDF generation ya implementados |

---

## Apéndice: Tablas de Base de Datos

30+ tablas principales organizadas por dominio:

| Dominio | Tablas |
|---------|--------|
| **Empresa** | `companies`, `company_settings`, `company_subscriptions`, `company_payroll_configurations`, `company_payroll_policies`, `company_field_definitions`, `company_schema_versions`, `branches`, `cost_centers` |
| **Empleados** | `employees`, `employee_identity_ledger`, `employee_vacation_balances`, `employee_vacation_periods`, `employee_notes`, `employee_note_mentions`, `employee_imports` |
| **Nómina** | `payroll_periods_real`, `payroll_periods`, `payroll_novedades`, `payroll_novedades_audit`, `payroll_calculation_runs`, `payroll_adjustments`, `payroll_period_corrections`, `payroll_reopen_audit`, `payroll_sync_log` |
| **Contabilidad** | `accounting_account_mappings`, `accounting_integrations`, `accounting_sync_logs` |
| **Dashboard** | `dashboard_activity`, `dashboard_alerts` |
| **Maya** | `maya_conversations`, `maya_messages`, `conversation_events` |
| **Conocimiento** | `legal_knowledge_base`, `embedding_queue` |
| **Catálogos** | `eps_entities`, `afp_entities`, `arl_entities`, `compensation_funds`, `tipos_cotizante`, `subtipos_cotizante` |

---

> **Nota**: Este documento refleja el estado actual del código al 2026-03-09. Se recomienda actualizarlo al agregar nuevos módulos o funcionalidades significativas.
