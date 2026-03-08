

## Plan: Integrar Prestaciones Sociales en Comprobantes de Nómina

### Problema Identificado
La función `liquidate-social-benefit` solo crea un registro en `social_benefit_payments` y marca las provisiones como liquidadas, pero **NO actualiza los campos `prima`, `cesantias`, `intereses_cesantias`** en la tabla `payrolls`. Por esto, cuando se genera el comprobante de pago, estas prestaciones aparecen en $0.

### Solución

#### 1. Modificar Edge Function `supabase/functions/liquidate-social-benefit/index.ts`

Después de crear el registro de pago y actualizar las provisiones, agregar lógica para actualizar los registros de nómina de los empleados afectados.

**Nuevo flujo al liquidar (después de la línea 326):**

```typescript
// 6. ACTUALIZAR PAYROLLS CON LOS MONTOS DE PRESTACIONES
console.log('📝 Actualizando registros de nómina con montos de prestaciones...');

// Determinar el campo a actualizar según el tipo de prestación
const fieldMap: Record<string, string> = {
  'prima': 'prima',
  'cesantias': 'cesantias', 
  'intereses_cesantias': 'intereses_cesantias',
  'vacaciones': 'vacaciones'
};

const updateField = fieldMap[benefitType];

if (updateField) {
  // Obtener el período de nómina más reciente (donde se reflejará la prestación)
  // Para prima semestre 1: buscar período de junio
  // Para prima semestre 2: buscar período de diciembre
  // Para cesantías/intereses: buscar período de diciembre o febrero
  
  // Buscar el último período cerrado dentro del rango
  const { data: targetPeriod } = await supabase
    .from('payroll_periods_real')
    .select('id, periodo, fecha_fin')
    .eq('company_id', companyId)
    .eq('estado', 'cerrado')
    .lte('fecha_fin', periodEnd)
    .order('fecha_fin', { ascending: false })
    .limit(1)
    .single();

  if (targetPeriod) {
    console.log(`   Período objetivo para actualizar: ${targetPeriod.periodo}`);
    
    // Actualizar cada empleado
    for (const emp of employeeList) {
      const { error: updatePayrollError } = await supabase
        .from('payrolls')
        .update({
          [updateField]: emp.total_amount,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', emp.employee_id)
        .eq('period_id', targetPeriod.id);

      if (updatePayrollError) {
        console.warn(`⚠️ No se pudo actualizar payroll para ${emp.employee_name}:`, updatePayrollError);
      } else {
        console.log(`   ✅ Actualizado ${updateField}=${emp.total_amount} para ${emp.employee_name}`);
      }
    }
    
    console.log(`✅ Payrolls actualizados con ${benefitType} para ${employeeList.length} empleados`);
  } else {
    console.warn('⚠️ No se encontró período de nómina cerrado para actualizar');
  }
}
```

#### 2. Consideración: Recálculo de totales

Cuando se actualiza el campo de prestación, también hay que recalcular:
- `total_devengado`: Sumar el monto de la prestación
- `neto_pagado`: Sumar el monto (las prestaciones no tienen deducciones adicionales)

```typescript
// Actualización completa con recálculo de totales
const { data: currentPayroll } = await supabase
  .from('payrolls')
  .select('total_devengado, neto_pagado')
  .eq('employee_id', emp.employee_id)
  .eq('period_id', targetPeriod.id)
  .single();

if (currentPayroll) {
  await supabase
    .from('payrolls')
    .update({
      [updateField]: emp.total_amount,
      total_devengado: (currentPayroll.total_devengado || 0) + emp.total_amount,
      neto_pagado: (currentPayroll.neto_pagado || 0) + emp.total_amount,
      updated_at: new Date().toISOString()
    })
    .eq('employee_id', emp.employee_id)
    .eq('period_id', targetPeriod.id);
}
```

#### 3. Lógica para determinar período objetivo

La prestación debe aparecer en el período de nómina correspondiente:

| Tipo de Prestación | Período donde aparece |
|---|---|
| Prima 1er Semestre | Última quincena/mes de junio |
| Prima 2do Semestre | Última quincena/mes de diciembre |
| Cesantías | Última quincena/mes de diciembre (o febrero si se paga al fondo) |
| Intereses Cesantías | Última quincena/mes de enero (o cuando se pague) |

```typescript
// Determinar fecha objetivo según tipo de prestación
const getTargetPeriodDate = (benefitType: string, periodEnd: string): string => {
  const endDate = new Date(periodEnd);
  const year = endDate.getFullYear();
  
  switch (benefitType) {
    case 'prima':
      // Prima aparece en el último período del semestre
      return periodEnd; // Ya viene el fin del semestre
    case 'cesantias':
    case 'intereses_cesantias':
      // Cesantías/intereses aparecen cuando se liquidan
      return periodEnd;
    default:
      return periodEnd;
  }
};
```

### Archivos a Modificar

1. **`supabase/functions/liquidate-social-benefit/index.ts`**
   - Agregar lógica para actualizar `payrolls` con el monto de la prestación
   - Recalcular `total_devengado` y `neto_pagado`
   - Manejar el caso de re-liquidación (anular y volver a aplicar)

### Consideraciones Adicionales

1. **Idempotencia**: Si la liquidación se ejecuta múltiples veces, no debe sumar dos veces el mismo monto
2. **Auditoría**: Registrar cuándo y por qué se actualizó el payroll
3. **Período cerrado**: Solo actualizar si hay un período cerrado donde reflejar la prestación; si no, crear el registro pendiente

### Resultado Esperado

- Al liquidar Prima de Servicios, el campo `prima` en `payrolls` se actualiza con el monto correspondiente
- Al generar el comprobante de pago, el PDF mostrará el valor de la Prima en la sección de devengos
- Los totales del comprobante reflejarán correctamente la inclusión de la prestación

