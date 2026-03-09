

## Análisis: Lo que falta para un Backoffice SaaS 100% funcional

### Lo que YA tienes (✓)
- Dashboard con KPIs (empresas, MRR, trials, crecimiento)
- CRUD de empresas (lista, detalle, filtros, ordenamiento)
- Cambio de plan y toggle de estado por empresa
- Editor manual de límites (empleados/nóminas)
- CRUD de planes desde base de datos
- Historial de auditoría de suscripciones
- Guard de SuperAdmin con roles

### Lo que FALTA

**1. Migrar código a usar planes dinámicos (prioridad alta)**
`AdminCompaniesPage.tsx` y `SuperAdminService.ts` todavía usan `PLANES_SAAS` hardcodeado en vez de la tabla `subscription_plans`. El selector de plan al cambiar empresa muestra los planes estáticos, no los de la BD.

**2. Gestión de Usuarios de Plataforma**
No hay forma de ver todos los usuarios registrados, sus roles, última actividad, ni asignar/revocar el rol `superadmin`. Página `/admin/users` con:
- Lista de usuarios con email, empresa, roles, último login
- Asignar/revocar roles (superadmin, soporte)
- Impersonar empresa (acceso temporal para soporte)

**3. Gestión de Trials**
No hay forma de extender o acortar el periodo trial de una empresa. Agregar en el detalle de empresa:
- Botón "Extender trial" con selector de fecha
- Alerta visual de trials próximos a vencer con acción directa

**4. Comunicaciones / Notificaciones**
No hay canal para enviar avisos a empresas (ej. mantenimiento, cambios de precio). Página `/admin/notifications`:
- Enviar notificación a todas las empresas o filtradas por plan/estado
- Historial de notificaciones enviadas

**5. Facturación y Pagos**
No hay tracking de pagos ni generación de facturas. Página `/admin/billing`:
- Estado de pago por empresa (pagado/pendiente/vencido)
- Historial de pagos
- Integración futura con pasarela de pago

**6. Configuración Global del Sistema**
No hay forma de ajustar parámetros globales. Página `/admin/settings`:
- Duración default del trial (días)
- Límites default por plan
- Feature flags globales
- Configuración de emails transaccionales

**7. Exportación de Datos**
No hay forma de exportar datos del backoffice. Agregar:
- Exportar lista de empresas a CSV/Excel
- Exportar métricas del dashboard
- Exportar historial de suscripciones

**8. Métricas avanzadas del Dashboard**
Faltan métricas clave de SaaS:
- Churn rate (tasa de cancelación)
- ARPU (ingreso promedio por usuario)
- Tasa de conversión trial → pago
- Retención por cohorte
- Revenue por plan

### Recomendación de prioridades

```text
Prioridad    Módulo                        Esfuerzo
─────────────────────────────────────────────────────
ALTA         1. Migrar a planes dinámicos   Bajo
ALTA         2. Gestión de usuarios          Medio
ALTA         3. Gestión de trials            Bajo
MEDIA        4. Exportación de datos         Bajo
MEDIA        5. Configuración global         Medio
MEDIA        6. Métricas avanzadas           Medio
BAJA         7. Comunicaciones               Alto
BAJA         8. Facturación y pagos          Alto
```

### Propuesta de implementación

Sugiero abordar en **3 fases**:

**Fase 1** (inmediata): Items 1-3 — Migrar planes dinámicos, gestión de usuarios, gestión de trials
**Fase 2** (corto plazo): Items 4-6 — Exportaciones, config global, métricas avanzadas
**Fase 3** (mediano plazo): Items 7-8 — Comunicaciones y facturación (requieren infraestructura adicional como email service y pasarela de pago)

¿Quieres que empiece con la Fase 1?

