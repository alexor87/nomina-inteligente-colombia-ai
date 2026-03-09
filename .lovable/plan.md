

# PRD: Panel SuperAdmin y Gestión de Suscripciones

## 1. Resumen Ejecutivo

**Producto:** NóminaInteligente Colombia AI
**Feature:** Panel de Administración SaaS (SuperAdmin) con gestión integral de suscripciones, empresas y métricas de negocio.
**Autor:** Sr. Product Manager
**Fecha:** 9 de marzo de 2026
**Prioridad:** P0 — Crítico para monetización y operación del SaaS

### Problema
Actualmente no existe ninguna interfaz para que el operador del SaaS gestione empresas clientes, cambie planes, monitoree suscripciones, identifique churn o actúe sobre trials vencidos. Toda gestión requiere acceso directo a la base de datos, lo cual es insostenible, inseguro y no escalable.

### Objetivo
Dotar al equipo operativo de un panel integrado que permita gestionar el ciclo de vida completo de las empresas clientes: desde el onboarding hasta la suspensión, con visibilidad total sobre métricas de negocio (MRR, churn, adopción).

### Métrica de Éxito
- Tiempo medio de gestión de una empresa cliente < 2 minutos (vs. acceso directo a DB)
- 100% de cambios de plan con audit trail
- Visibilidad en tiempo real de MRR y trials por vencer

---

## 2. Estado Actual del Sistema

### Infraestructura existente que se reutiliza

| Componente | Estado | Detalle |
|---|---|---|
| `company_subscriptions` table | ✅ Existe | `plan_type`, `status`, `max_employees`, `max_payrolls_per_month`, `features` (jsonb), `trial_ends_at`, `subscription_starts_at/ends_at` |
| `companies` table | ✅ Existe | `plan`, `estado` (activa/suspendida/inactiva), `nit`, `razon_social` |
| `SubscriptionContext` | ✅ Existe | Hook `useSubscription` con `canAddEmployees()`, `canProcessPayroll()`, `hasFeature()`, `isTrialExpired` |
| `PLANES_SAAS` constante | ✅ Existe | 3 niveles: Básico ($15K, 10 emp), Profesional ($35K, 50 emp), Empresarial ($75K, ilimitado) |
| `isSuperAdmin` en AuthContext | ✅ Existe | Flag booleano, actualmente sin asignación real (siempre `false`) |
| `CompanyManagementService` | ✅ Existe | `getAllCompanies()`, `suspendCompany()`, `activateCompany()` |
| Rol `soporte` en `app_role` enum | ✅ Existe | Usado para acceso cross-company en RLS de `employees` y `payroll_novedades` |
| `ProtectedRoute` con `requiredRole` | ✅ Existe | Listo para proteger rutas admin |

### Gaps identificados

| Gap | Impacto |
|---|---|
| No existe rol `superadmin` en el enum `app_role` | No se puede diferenciar soporte operativo de gestión SaaS |
| No hay tabla de audit trail para cambios de suscripción | No hay trazabilidad de quién cambió qué plan y por qué |
| No hay UI de administración | Gestión imposible sin acceso a DB |
| `isSuperAdmin` nunca se setea a `true` | El flag existe pero no funciona |
| No hay enforcement real de límites | `canAddEmployees` existe pero no se invoca en flujos de creación |
| RLS no permite acceso cross-company al superadmin | Solo `soporte` tiene acceso parcial vía `validate_support_company_access` |

---

## 3. Usuarios y Personas

| Persona | Rol | Necesidad Principal |
|---|---|---|
| **Operador SaaS** (superadmin) | Dueño/equipo core de NóminaInteligente | Ver métricas de negocio, gestionar planes, suspender/activar empresas, resolver escalaciones |
| **Empresa cliente** (administrador) | Admin de una empresa en la plataforma | Ver su plan actual, entender sus límites, recibir alertas de upgrade |

---

## 4. Requerimientos Funcionales

### 4.1 Gestión de Acceso SuperAdmin

**RF-01:** Agregar valor `superadmin` al enum `app_role` de PostgreSQL.

**RF-02:** Crear función SQL `is_superadmin()` como `SECURITY DEFINER` que verifique si `auth.uid()` tiene rol `superadmin` en `user_roles`.

**RF-03:** Actualizar `AuthContext` para detectar rol `superadmin` y setear `isSuperAdmin = true` usando la tabla `user_roles` (no hardcoded, no localStorage).

**RF-04:** Las rutas `/admin/*` deben estar protegidas con `ProtectedRoute requiredRole="superadmin"`. Un usuario sin este rol ve "Acceso Denegado".

### 4.2 Dashboard de Métricas SaaS

**RF-05:** Página `/admin/dashboard` con cards de métricas:
- Total empresas activas
- Total empresas en trial
- Trials que vencen en los próximos 7 días (alerta)
- MRR calculado (suma de `precio` por plan de empresas activas)
- Total empleados across all companies
- Distribución por plan (gráfico de dona)
- Tendencia de crecimiento de empresas (gráfico de línea, últimos 6 meses)

**RF-06:** Las métricas se calculan con queries directos a `companies` + `company_subscriptions` + `employees` (count). El superadmin tiene RLS policies que permiten SELECT cross-company.

### 4.3 Gestión de Empresas

**RF-07:** Página `/admin/companies` con tabla que muestra:
- Razón social, NIT, plan actual, estado, cantidad de empleados, fecha de registro, trial expira en
- Filtros por: plan (basico/profesional/empresarial), estado (activa/suspendida/trial)
- Búsqueda por razón social o NIT
- Ordenamiento por fecha de registro, empleados, plan

**RF-08:** Acciones por empresa desde la tabla:
- **Ver detalle** → navega a `/admin/companies/:id`
- **Cambiar plan** → Dialog con selector de plan, campo de razón del cambio, confirmación
- **Suspender/Activar** → Toggle con confirmación y razón obligatoria

**RF-09:** Página `/admin/companies/:id` con:
- Información de la empresa (datos de `companies`)
- Suscripción actual (datos de `company_subscriptions`)
- Usuarios asociados (query a `profiles` + `user_roles` por `company_id`)
- Conteo de empleados y nóminas procesadas
- Historial de cambios de suscripción (de la nueva tabla `subscription_events`)

### 4.4 Audit Trail de Suscripciones

**RF-10:** Crear tabla `subscription_events` con:
- `company_id`, `previous_plan`, `new_plan`, `previous_status`, `new_status`
- `changed_by` (UUID del superadmin que hizo el cambio)
- `reason` (texto obligatorio)
- `metadata` (jsonb para datos adicionales)
- `created_at`

**RF-11:** Todo cambio de plan o estado debe insertar un registro en `subscription_events` de forma atómica (misma transacción).

**RF-12:** Página `/admin/subscriptions` con timeline cronológico de todos los eventos across companies. Filtrable por empresa y tipo de cambio.

### 4.5 Enforcement de Límites en Flujos Existentes

**RF-13:** Antes de crear un empleado, verificar `canAddEmployees()` del `SubscriptionContext`. Si se excede el límite, mostrar modal de upgrade con el plan sugerido.

**RF-14:** Antes de crear un período de nómina, verificar `canProcessPayroll()`. Mismo comportamiento de bloqueo con sugerencia de upgrade.

**RF-15:** Si `isTrialExpired === true`, mostrar banner persistente en el dashboard del cliente indicando que debe contactar para activar su plan. No bloquear acceso total, pero deshabilitar acciones de escritura (crear empleados, liquidar nómina).

### 4.6 Navegación y UX

**RF-16:** En el `UserMenu` del sidebar, si `isSuperAdmin === true`, mostrar un enlace "Panel Admin" que lleve a `/admin/dashboard`.

**RF-17:** El layout del panel admin (`AdminLayout`) debe ser visualmente distinto: header con badge "SuperAdmin", sidebar simplificado con solo las secciones admin, y un botón "Volver a la app" para regresar a `/modules/dashboard`.

---

## 5. Requerimientos No Funcionales

**RNF-01:** Todas las queries del superadmin deben pasar por RLS (no bypass directo). Se agregan policies específicas que usan `is_superadmin()`.

**RNF-02:** La función `is_superadmin()` debe ser `SECURITY DEFINER` para evitar recursión en RLS.

**RNF-03:** Las rutas `/admin/*` deben usar lazy loading para no impactar el bundle de usuarios regulares.

**RNF-04:** La arquitectura debe permitir integrar Stripe en el futuro sin refactoring: `company_subscriptions` ya tiene campos de fechas; solo se agregarían `stripe_customer_id` y `stripe_subscription_id`.

**RNF-05:** Tiempo de carga del dashboard admin < 3 segundos con hasta 500 empresas.

---

## 6. Fuera de Alcance (v1)

- Integración con Stripe/pasarela de pago (se prepara la estructura, no se implementa)
- Self-service upgrade por parte del cliente (v2)
- Facturación automática y generación de facturas
- Notificaciones por email al cliente sobre cambios de plan
- Panel de analytics avanzado (cohorts, LTV, CAC)

---

## 7. Arquitectura Técnica

### Nuevos archivos

```text
src/
├── pages/admin/
│   ├── AdminDashboardPage.tsx    -- Métricas SaaS
│   ├── AdminCompaniesPage.tsx    -- Tabla de empresas
│   ├── AdminCompanyDetailPage.tsx -- Detalle empresa
│   └── AdminSubscriptionsPage.tsx -- Timeline de eventos
├── components/admin/
│   ├── AdminLayout.tsx           -- Layout con sidebar admin
│   ├── AdminSidebar.tsx          -- Navegación admin
│   ├── MetricsCards.tsx          -- Cards de KPIs
│   ├── CompanyTable.tsx          -- Tabla filtrable
│   ├── PlanChangeDialog.tsx      -- Modal cambio de plan
│   └── SubscriptionTimeline.tsx  -- Timeline de eventos
├── services/
│   └── SuperAdminService.ts      -- Queries cross-company
├── hooks/
│   └── useSubscriptionLimits.ts  -- Enforcement en flujos
```

### Cambios en archivos existentes
- `App.tsx` — Agregar rutas `/admin/*` con lazy loading
- `AuthContext.tsx` — Detectar rol `superadmin` desde `user_roles`
- `UserMenu.tsx` — Link a panel admin si `isSuperAdmin`
- `types/roles.ts` — Agregar `superadmin` al type `AppRole`

### Migraciones SQL
1. `ALTER TYPE app_role ADD VALUE 'superadmin'`
2. `CREATE TABLE subscription_events`
3. `CREATE FUNCTION is_superadmin()`
4. RLS policies para acceso cross-company del superadmin en `companies`, `company_subscriptions`, `employees` (SELECT), `profiles` (SELECT)

---

## 8. Plan de Implementación por Fases

| Fase | Entregable | Dependencia |
|---|---|---|
| **1. DB + Seguridad** | Migración SQL: enum, tabla events, función, RLS | Ninguna |
| **2. Backend lógico** | `SuperAdminService.ts` + actualizar AuthContext | Fase 1 |
| **3. Layout + Routing** | `AdminLayout`, rutas en App.tsx, link en UserMenu | Fase 2 |
| **4. Dashboard Admin** | `AdminDashboardPage` con métricas reales (Recharts) | Fase 3 |
| **5. Gestión Empresas** | `AdminCompaniesPage` + `AdminCompanyDetailPage` + `PlanChangeDialog` | Fase 3 |
| **6. Audit Trail** | `AdminSubscriptionsPage` con timeline | Fase 1 |
| **7. Enforcement** | `useSubscriptionLimits` integrado en flujos de empleados y nómina | Fase 2 |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| RLS recursiva al agregar policies de superadmin | Media | Usar `SECURITY DEFINER` en `is_superadmin()` como ya se hace con `has_role()` |
| Performance con muchas empresas en dashboard | Baja (< 500 empresas en v1) | Queries con aggregations en SQL, no cargar todos los registros |
| Superadmin modifica plan sin querer | Media | Confirmación con doble paso + razón obligatoria + audit trail |

