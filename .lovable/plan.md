

# PRD — Fase 3: Comunicaciones y Facturación

## 1. Visión General

La Fase 3 completa el backoffice SaaS de NóminaInteligente con dos módulos críticos para la operación: un sistema de comunicaciones unidireccionales (SuperAdmin → empresas) y un módulo de facturación y tracking de pagos. Juntos cierran el ciclo operativo: el SuperAdmin puede notificar cambios, cobrar, y dar seguimiento a la cartera.

---

## 2. Usuarios y Roles

| Actor | Capacidades |
|---|---|
| **SuperAdmin** | Crear/eliminar notificaciones, generar facturación mensual, registrar pagos, marcar vencidos, exportar |
| **Admin de Empresa** | Ver notificaciones del sistema, marcar como leídas |
| **Usuarios regulares** | Ver notificaciones (solo lectura) |

---

## 3. Módulo A: Comunicaciones / Notificaciones del Sistema

### 3.1 Problema
No existe canal para que el operador de la plataforma comunique mantenimientos programados, cambios de precio, vencimientos de trial, o novedades regulatorias a las empresas clientes.

### 3.2 Funcionalidades

**Panel SuperAdmin (`/admin/notifications`)**
- Tabla de notificaciones enviadas: título, prioridad, fecha, destinatarios alcanzados, estado (activa/expirada)
- Crear notificación con:
  - Título (requerido, max 120 chars)
  - Mensaje (requerido, texto largo con formato básico)
  - Prioridad: `info` | `warning` | `critical`
  - Filtro de destinatarios por plan y/o estado (multi-select, vacío = todas)
  - Fecha de expiración (opcional)
- Eliminar/expirar notificaciones
- Contador de empresas alcanzadas y lecturas

**Campana de notificaciones (app principal)**
- Icono Bell en el `DynamicHeader` del layout principal
- Badge con conteo de no leídas
- Popover con lista de notificaciones activas para la empresa del usuario
- Marcar como leída al abrir/click
- Prioridad `critical` se muestra con estilo destacado (rojo)

### 3.3 Modelo de Datos

```text
admin_notifications
├── id (uuid, PK)
├── title (text, NOT NULL)
├── message (text, NOT NULL)
├── priority (text: 'info'|'warning'|'critical', default 'info')
├── target_plans (text[], nullable — null = todas)
├── target_statuses (text[], nullable — null = todas)
├── created_by (uuid, FK → auth.users)
├── expires_at (timestamptz, nullable)
├── created_at (timestamptz, default now())

admin_notification_reads
├── id (uuid, PK)
├── notification_id (uuid, FK → admin_notifications, ON DELETE CASCADE)
├── user_id (uuid, FK → auth.users)
├── company_id (uuid, FK → companies)
├── read_at (timestamptz, default now())
└── UNIQUE(notification_id, user_id)
```

**RLS:**
- `admin_notifications`: SuperAdmin full CRUD; authenticated users SELECT where notification matches their company's plan/status and not expired
- `admin_notification_reads`: Users INSERT/SELECT own records only

### 3.4 Criterios de Aceptación
- [ ] SuperAdmin puede crear notificación con filtros de plan/estado
- [ ] Notificación aparece en campana de usuarios de empresas que cumplen filtro
- [ ] Badge muestra conteo correcto de no leídas
- [ ] Al hacer click se marca como leída y desaparece del conteo
- [ ] Notificaciones expiradas no se muestran a usuarios
- [ ] Notificaciones `critical` tienen estilo visual diferenciado
- [ ] SuperAdmin ve cuántas empresas/usuarios han leído cada notificación

---

## 4. Módulo B: Facturación y Tracking de Pagos

### 4.1 Problema
No hay visibilidad del estado de cobro de las empresas. El SuperAdmin no puede saber quién ha pagado, quién está pendiente, ni generar un registro mensual de facturación basado en los planes activos.

### 4.2 Funcionalidades

**Panel SuperAdmin (`/admin/billing`)**

*Resumen (cards superiores):*
- Total facturado del periodo
- Total cobrado (pagado)
- Pendiente de cobro
- Vencido

*Tabla principal:*
- Empresa, plan, monto, estado de pago, fecha vencimiento, referencia de pago
- Filtros: periodo (mes/año), estado (pendiente/pagado/vencido)
- Búsqueda por nombre de empresa

*Acciones:*
- **Generar facturación mensual**: Auto-crea registros para todas las empresas activas con el precio de su plan actual. No duplica si ya existe registro del periodo.
- **Registrar pago**: Dialog con campos: método de pago (transferencia/efectivo/PSE/otro), referencia, fecha de pago, notas.
- **Marcar como vencido**: Bulk action para registros pendientes cuya fecha de vencimiento ha pasado.
- **Exportar a Excel**: Descarga del periodo actual con todos los campos.

### 4.3 Modelo de Datos

```text
company_billing
├── id (uuid, PK)
├── company_id (uuid, FK → companies, NOT NULL)
├── period (text, NOT NULL — formato 'YYYY-MM')
├── plan_type (text — plan al momento de facturar)
├── amount (numeric, NOT NULL)
├── status (text: 'pendiente'|'pagado'|'vencido', default 'pendiente')
├── due_date (date, NOT NULL)
├── paid_at (timestamptz, nullable)
├── payment_method (text, nullable)
├── payment_reference (text, nullable)
├── notes (text, nullable)
├── created_at (timestamptz, default now())
├── updated_at (timestamptz, default now())
└── UNIQUE(company_id, period)
```

**RLS:**
- SuperAdmin: full CRUD
- Company users: SELECT own records (para futuro portal de facturación del cliente)

### 4.4 Criterios de Aceptación
- [ ] "Generar Facturación" crea un registro por empresa activa con el precio de su plan
- [ ] No se duplican registros si el periodo ya fue generado
- [ ] SuperAdmin puede registrar pago con método y referencia
- [ ] Estado cambia a `pagado` con timestamp
- [ ] "Marcar Vencidos" actualiza registros pendientes con `due_date < hoy`
- [ ] Cards de resumen muestran totales correctos del periodo seleccionado
- [ ] Export Excel incluye todos los campos relevantes

---

## 5. Cambios Técnicos

### Archivos nuevos
| Archivo | Descripción |
|---|---|
| `src/pages/admin/AdminNotificationsPage.tsx` | CRUD de notificaciones del sistema |
| `src/pages/admin/AdminBillingPage.tsx` | Gestión de facturación y pagos |
| `src/components/notifications/AdminNotificationBell.tsx` | Campana + popover en layout principal |
| Migration SQL | 2 tablas + RLS + índices |

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/services/SuperAdminService.ts` | Métodos de notificaciones y billing |
| `src/services/AdminExportService.ts` | `exportBillingToExcel()` |
| `src/components/admin/AdminLayout.tsx` | Nav items: Notificaciones, Facturación |
| `src/App.tsx` | 2 rutas lazy nuevas |
| `src/components/shared/DynamicHeader.tsx` | Integrar `AdminNotificationBell` |
| `src/integrations/supabase/types.ts` | Tipos de las nuevas tablas |

### Servicios — Métodos nuevos

```text
SuperAdminService
├── getNotifications() → AdminNotification[]
├── createNotification(data) → void
├── deleteNotification(id) → void
├── getNotificationStats(id) → { total_reached, total_read }
├── getUserNotifications(companyId, planType, status) → notifs con read status
├── markNotificationRead(notificationId, userId, companyId) → void
├── getBillingRecords(period?) → BillingRecord[]
├── generateMonthlyBilling(period) → { created: number, skipped: number }
├── registerPayment(id, method, reference, notes) → void
├── markOverdueBilling() → { updated: number }
└── getBillingSummary(period) → { total, paid, pending, overdue }
```

---

## 6. Flujos de Usuario

### Flujo: Enviar notificación de mantenimiento
1. SuperAdmin → `/admin/notifications` → "Crear Notificación"
2. Llena título: "Mantenimiento programado 15 de marzo"
3. Prioridad: `warning`
4. Filtro: todas las empresas (sin filtro)
5. Expira: 2026-03-16
6. Guarda → aparece en tabla con conteo de empresas alcanzadas
7. Usuarios de empresas ven badge en campana → abren → leen → se marca leída

### Flujo: Ciclo de facturación mensual
1. SuperAdmin → `/admin/billing` → selecciona periodo "2026-03"
2. Click "Generar Facturación" → sistema crea registros para empresas activas
3. Ve tabla con todas las empresas, montos según plan, estado "pendiente"
4. Empresa X paga → click "Registrar Pago" → llena referencia PSE
5. Fin de mes → click "Marcar Vencidos" → pendientes con due_date pasada → "vencido"
6. Exporta reporte Excel del periodo

---

## 7. Fuera de Alcance (v1)
- Pasarela de pago integrada (Wompi, PayU, etc.)
- Facturación electrónica DIAN
- Notificaciones por email/SMS (solo in-app)
- Portal de facturación del cliente (solo vista admin)
- Cobro automático recurrente

---

## 8. Prioridad de Implementación

1. **Tablas + RLS + tipos** (prerequisito)
2. **Notificaciones admin** (CRUD en `/admin/notifications`)
3. **Campana de usuario** (Bell en `DynamicHeader`)
4. **Billing admin** (CRUD en `/admin/billing`)
5. **Export billing** + integración en `AdminExportService`

