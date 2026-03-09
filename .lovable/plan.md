
# Plan: Generar PRD.md Completo del Proyecto

## Objetivo
Crear un documento `PRD.md` en la raíz del proyecto que documente exhaustivamente todos los módulos, funcionalidades, arquitectura y estado actual de **NóminaInteligente Colombia AI**.

## Contenido del PRD

El documento cubrirá los siguientes módulos identificados en el codebase:

### 1. Visión General del Producto
- Plataforma SaaS de nómina colombiana con asistente IA (Maya)
- Stack: React + Vite + TypeScript + Tailwind + Supabase
- Multi-empresa con RLS, lazy loading, Zustand para estado

### 2. Módulos Funcionales Documentados

| Módulo | Rutas | Estado |
|--------|-------|--------|
| **Auth & Onboarding** | `/login`, `/register`, `/register/company`, `/reset-password` | ✅ Completo |
| **Dashboard** | `/modules/dashboard` | ✅ Completo — métricas, tendencias, acciones rápidas, feed actividad |
| **Empleados** | `/modules/employees`, `create`, `edit` | ✅ Completo — CRUD, wizard, importación Excel, filtros, bulk actions, soft delete, campos custom |
| **Liquidación de Nómina** | `/modules/payroll` | ✅ Completo — selección período, novedades, cálculo backend, auto-save, auditoría, versionamiento |
| **Historial de Nómina** | `/modules/payroll-history`, `/:periodId` | ✅ Completo — detalle por período, correcciones, rollback |
| **Prestaciones Sociales** | `/modules/prestaciones-sociales`, `/liquidar/:type/:period` | ✅ Completo — cesantías, intereses, prima, provisiones, anulación, consolidación mensual |
| **Vacaciones y Ausencias** | `/modules/vacations-absences` | ✅ Completo — balance, conflictos, integración con nómina, ausencias multi-período |
| **Reportes** | `/modules/reports` | ✅ Completo — 6 tipos (resumen nómina, costos laborales, seguridad social, historial novedades, retención, exportación contable) |
| **Maya (Asistente IA)** | `/maya` + floating assistant | ✅ Completo — flujos guiados, simulador what-if, detección proactiva, consultas KISS |
| **Configuración** | `/modules/settings` | ✅ Completo — 9 tabs (empresa, empleados, aportes, DIAN, parámetros, contratos, alertas, integraciones, facturación) |
| **Perfil** | `/modules/profile` | ✅ Completo |

### 3. Secciones Adicionales
- **Arquitectura de servicios**: SecureBaseService, 80+ services especializados
- **Edge Functions**: 22 funciones Supabase (liquidación atómica, cálculos, vouchers, Maya intelligence, etc.)
- **Seguridad**: RLS, roles en tabla separada, `has_role()` security definer
- **Contabilidad**: Mapeo PUC personalizable, exportación contable
- **Testing**: Vitest + Testing Library (25+ tests existentes)
- **Roadmap inferido**: Nómina electrónica DIAN, integraciones contables, mobile optimization

## Implementación
- Crear un único archivo `PRD.md` en la raíz (~400-500 líneas)
- Organizado con tabla de contenidos, secciones claras, tablas de resumen
- Basado 100% en lo que existe en el código, sin inventar features
