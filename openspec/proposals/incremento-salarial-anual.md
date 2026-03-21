# OpenSpec: Incremento Salarial Anual
**Archivo:** `openspec/proposals/incremento-salarial-anual.md`
**Fecha:** 2026-03-21
**Estado:** Propuesta
**Prioridad:** Alta — Cumplimiento Legal

---

## 1. Problema

El sistema no tiene mecanismo para gestionar el cambio de salarios al inicio de cada año.
En Colombia, ningún empleado puede ganar menos del SMLMV vigente. Cuando el gobierno
decreta el nuevo SMLMV (normalmente en diciembre para aplicar desde enero), el sistema
debe:

1. Detectar qué empleados quedan por debajo del nuevo mínimo.
2. Forzar su ajuste (es obligación legal, no decisión del empleador).
3. Permitir al empleador definir el incremento para los demás empleados.
4. Aplicar los nuevos salarios con vigencia desde el primer día del año nuevo,
   sin modificar el historial previo.

Adicionalmente, el campo `salario_base` en la tabla `employees` es un valor plano
sin historial. Esto impide auditoría legal y hace imposible saber qué ganaba un
empleado en un período anterior.

---

## 2. Solución

### 2.1 Nueva tabla: `employee_salary_history`
```sql
create table employee_salary_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  salario_base numeric(12,2) not null,
  fecha_vigencia date not null,
  motivo text not null check (motivo in (
    'incremento_anual',
    'ajuste_minimo_legal',
    'merito',
    'promocion',
    'correccion',
    'ingreso'
  )),
  porcentaje_incremento numeric(5,2),
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- RLS
alter table employee_salary_history enable row level security;
create policy "company_isolation" on employee_salary_history
  using (company_id = (select company_id from user_roles where user_id = auth.uid() limit 1));

-- Índices
create index on employee_salary_history(employee_id, fecha_vigencia desc);
create index on employee_salary_history(company_id);
```

### 2.2 Migración de datos existentes

Al aplicar la migration, poblar `employee_salary_history` con el salario actual
de cada empleado usando `fecha_vigencia = '2024-01-01'` y `motivo = 'ingreso'`.
El campo `salario_base` en `employees` se mantiene como "salario vigente hoy"
para compatibilidad con el resto del sistema — se actualiza cada vez que se
confirma un nuevo registro en el historial.

### 2.3 Motor de nómina

En `PayrollCalculationBackendService` y la Edge Function `payroll-calculations`,
al obtener el salario de un empleado para un período, usar:
```sql
select salario_base from employee_salary_history
where employee_id = $1
  and fecha_vigencia <= $periodo_inicio
order by fecha_vigencia desc
limit 1
```

Esto garantiza que si un período es de enero, usa el salario de enero; si es
de diciembre del año anterior, usa el de diciembre.

---

## 3. Nueva Feature: Wizard de Incremento Salarial Anual

### 3.1 Punto de entrada

Dos puntos de acceso:

**A)** En `Configuración → Parámetros Legales`, cuando el admin guarda el SMLMV
de un año nuevo (mayor al actual), aparece un banner:

> "Se detectaron N empleados que requieren ajuste salarial para [año].
> [Iniciar proceso de incremento →]"

**B)** En el Dashboard, una alerta de tipo `warning` en `dashboard_alerts` generada
automáticamente al guardar el nuevo SMLMV.

### 3.2 Ruta

`/modules/settings/salary-increase/:year`

### 3.3 Wizard — 3 pasos

---

#### Paso 1: Empleados en zona de riesgo (Ajuste obligatorio)

**Lógica:**
- Cargar todos los empleados activos de la empresa.
- Compararlos contra el nuevo SMLMV del año seleccionado.
- Clasificar en:
  - 🔴 **Ajuste obligatorio**: `salario_base <= nuevo_SMLMV` → nuevo salario = nuevo SMLMV exacto.
  - 🟡 **Zona de riesgo**: `salario_base > nuevo_SMLMV AND salario_base < nuevo_SMLMV * 1.05`
    → advertencia, el empleador decide pero se muestra el riesgo.
  - 🟢 **Sin riesgo legal**: `salario_base >= nuevo_SMLMV * 1.05`

**UI:**
- Tabla con columnas: Empleado | Salario actual | Salario propuesto | Diferencia | Estado
- Los de ajuste obligatorio tienen el salario propuesto bloqueado (no editable).
- Los de zona de riesgo muestran un tooltip explicando el riesgo.
- Contador en la cabecera: "X empleados con ajuste obligatorio | Y en zona de riesgo"

**Componentes shadcn/ui a usar:**
`Table`, `TableHeader`, `TableRow`, `TableCell`, `Badge` (variantes: destructive,
warning, success), `Tooltip`, `Alert` con ícono `AlertTriangle` de lucide-react.

---

#### Paso 2: Política de incremento general

**Para los empleados SIN ajuste obligatorio**, el admin elige una estrategia:

**Opción A — Porcentaje uniforme**
Un input numérico con el porcentaje. El sistema muestra en tiempo real la
previsualización de cuántos quedarían por debajo del mínimo con ese porcentaje
(validación en vivo).

**Opción B — Por tabla (cargo o área)**
Tabla editable donde el admin define el porcentaje por cada cargo o centro
de costos presente en la empresa.

**Opción C — Revisión individual**
Sin aplicar ningún porcentaje masivo; el admin ajustará empleado por empleado
en el Paso 3.

**UI:**
`RadioGroup` de shadcn/ui para las 3 opciones.
`Input` con validación para el porcentaje (0.01 – 100).
`Card` con previsualización de impacto en costo laboral total al cambiar el valor.

---

#### Paso 3: Revisión y confirmación

**Tabla final con todos los empleados:**

| Empleado | Cargo | Salario actual | Salario nuevo | Δ% | Motivo | Editar |
|----------|-------|----------------|---------------|----|--------|--------|

- Los de ajuste obligatorio tienen la columna "Salario nuevo" con badge rojo y
  no son editables.
- Los demás son editables inline (click en el valor para editar).
- Al editar manualmente uno, su motivo cambia a `'merito'` automáticamente.
- Columna "Δ%" muestra en verde si es incremento, rojo si baja (no debería
  permitirse bajar salarios — validar).

**Resumen en card al fondo:**
- Costo nómina actual (mes) vs. costo nómina nuevo (mes)
- Diferencia en pesos y porcentaje
- Número de empleados afectados

**Botón de confirmación:**
`"Aplicar incrementos desde el [fecha_vigencia]"`

La fecha de vigencia por defecto es el 1 de enero del año seleccionado,
pero el admin puede cambiarla (algunos decretos se publican tarde).

**Componentes shadcn/ui:**
`Table` editable, `Input` inline, `Badge`, `Card`, `Separator`,
`Button` (primary para confirmar, outline para volver), `DatePicker` para
fecha de vigencia, `Dialog` de confirmación final antes de aplicar.

---

### 3.4 Proceso de aplicación (al confirmar)

1. Crear un registro en `employee_salary_history` por cada empleado con:
   - `salario_base` = nuevo salario
   - `fecha_vigencia` = fecha elegida
   - `motivo` = según clasificación
   - `porcentaje_incremento` = calculado
   - `created_by` = usuario autenticado

2. Actualizar `employees.salario_base` si `fecha_vigencia <= hoy` (para mantener
   el campo en sync con el presente).

3. Registrar en `dashboard_activity` una entrada del tipo:
   `"Incremento salarial [año] aplicado — X empleados actualizados"`

4. Disparar recálculo de auxilio de transporte: para empleados que con el nuevo
   salario crucen el umbral de 2 SMLMV (hacia arriba o hacia abajo), actualizar
   la configuración correspondiente.

5. Cerrar la alerta en `dashboard_alerts` que originó el proceso.

---

## 4. Servicio a crear: `SalaryIncreaseService`
```typescript
// src/services/employees/SalaryIncreaseService.ts

interface SalaryIncreaseProposal {
  employeeId: string;
  currentSalary: number;
  proposedSalary: number;
  percentage: number;
  reason: SalaryChangeReason;
  isLegallyRequired: boolean;
  riskLevel: 'required' | 'warning' | 'safe';
}

interface SalaryIncreaseResult {
  applied: number;
  skipped: number;
  errors: string[];
}

class SalaryIncreaseService extends SecureBaseService {
  // Obtiene el salario vigente de un empleado en una fecha dada
  async getSalaryAtDate(employeeId: string, date: Date): Promise<number | null>

  // Analiza todos los empleados vs nuevo SMLMV y genera propuestas
  async analyzeYearTransition(year: number): Promise<SalaryIncreaseProposal[]>

  // Aplica los incrementos confirmados
  async applyIncrements(
    proposals: SalaryIncreaseProposal[],
    effectiveDate: Date
  ): Promise<SalaryIncreaseResult>

  // Historial de cambios de un empleado
  async getEmployeeSalaryHistory(employeeId: string): Promise<EmployeeSalaryHistoryRecord[]>
}
```

---

## 5. Integración con Maya

Extender `proactiveDetectionFlow.ts` para incluir una nueva detección:

**Trigger:** Cuando el año del sistema avanza y existe un SMLMV configurado para
el nuevo año pero no se ha ejecutado el proceso de incremento.

**Mensaje de Maya:**
> "Detecté que el SMLMV 2026 está configurado en $X pero hay N empleados
> cuyos salarios aún no han sido ajustados para el nuevo año. ¿Quieres que
> iniciemos el proceso de incremento salarial anual ahora?"

Con botón de acción directa al wizard.

---

## 6. Restricciones de diseño

- **Componentes UI:** Usar exclusivamente shadcn/ui (style: default, baseColor: slate)
  con los alias ya configurados en `components.json`. No introducir librerías
  de UI externas.
- **Iconos:** Exclusivamente `lucide-react` (ya instalado).
- **Estilos:** Tailwind CSS con variables CSS del sistema. No CSS inline.
- **Patrones existentes:** Seguir el patrón de wizard multi-paso usado en
  `CompanyRegistrationPage` y la creación de empleados para consistencia visual.
- **Servicios:** Extender `SecureBaseService` como todos los demás servicios.
- **Estado servidor:** TanStack React Query v5 para fetching y mutations.
- **Animaciones:** Framer Motion para transiciones entre pasos (ya instalado).

---

## 7. Fases de implementación

| Fase | Alcance | Prioridad |
|------|---------|-----------|
| **Fase 1** | Migration SQL + `SalaryIncreaseService.getSalaryAtDate()` + motor de nómina lee del historial | Crítica |
| **Fase 2** | Wizard completo (3 pasos) + aplicación de incrementos | Alta |
| **Fase 3** | Integración Maya + alerta dashboard automática | Media |

**Fase 1 debe completarse antes del siguiente período de nómina del año nuevo.**

---

## 8. Tests requeridos

- `SalaryIncreaseService.test.ts`: caso empleado en mínimo, caso zona de riesgo,
  caso por encima, aplicación correcta de vigencia por fecha.
- `PayrollCalculationService.test.ts`: agregar caso que verifica que el motor
  usa el salario vigente a la fecha del período, no el salario actual.
- E2E en `e2e/salary-increase.spec.ts`: flujo completo del wizard.
