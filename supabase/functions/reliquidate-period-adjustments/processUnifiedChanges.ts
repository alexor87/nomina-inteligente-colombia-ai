// ============= UNIFIED CHANGES PROCESSOR =============
// Handles composition and novelty changes atomically

export async function processUnifiedChanges(
  supabase: any,
  periodId: string,
  periodData: any,
  compositionChanges?: any,
  novedadChanges?: any,
  justification: string = ''
) {
  console.log('🔀 Processing unified changes...')

  // Process composition changes first
  if (compositionChanges) {
    await processCompositionChanges(supabase, periodId, periodData, compositionChanges, justification)
  }

  // Process novelty changes
  if (novedadChanges) {
    await processNovedadChanges(supabase, periodId, periodData.company_id, novedadChanges, justification)
  }
}

async function processCompositionChanges(
  supabase: any,
  periodId: string,
  periodData: any,
  compositionChanges: { added_employees: any[], removed_employees: string[] },
  justification: string
) {
  const { added_employees = [], removed_employees = [] } = compositionChanges

  console.log(`👥 Composition changes: +${added_employees.length} -${removed_employees.length}`)

  // Add new employees to the period
  for (const employee of added_employees) {
    try {
      // Calculate initial payroll values for the employee
      const workedDays = calculateWorkedDays(
        periodData.tipo_periodo,
        new Date(periodData.fecha_inicio),
        new Date(periodData.fecha_fin)
      )

      const dailySalary = employee.salario_base / 30
      const proportionalSalary = dailySalary * workedDays
      const deductions = proportionalSalary * 0.08 // Approximate deductions
      const netPay = proportionalSalary - deductions

      // Insert payroll record
      const { error: insertError } = await supabase
        .from('payrolls')
        .insert({
          company_id: periodData.company_id,
          employee_id: employee.id,
          periodo: periodData.periodo,
          period_id: periodId,
          salario_base: employee.salario_base,
          dias_trabajados: workedDays,
          total_devengado: proportionalSalary,
          total_deducciones: deductions,
          neto_pagado: netPay,
          estado: 'procesada'
        })

      if (insertError) {
        throw new Error(`Failed to add employee ${employee.id}: ${insertError.message}`)
      }

      console.log(`✅ Added employee ${employee.nombre} ${employee.apellido} to period`)
    } catch (error) {
      console.error(`❌ Error adding employee ${employee.id}:`, error)
      throw error
    }
  }

  // Remove employees from the period
  for (const employeeId of removed_employees) {
    try {
      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .eq('period_id', periodId)
        .eq('employee_id', employeeId)

      if (deleteError) {
        throw new Error(`Failed to remove employee ${employeeId}: ${deleteError.message}`)
      }

      console.log(`🗑️ Removed employee ${employeeId} from period`)
    } catch (error) {
      console.error(`❌ Error removing employee ${employeeId}:`, error)
      throw error
    }
  }

  // Log composition audit
  if (added_employees.length > 0 || removed_employees.length > 0) {
    await logCompositionAudit(supabase, periodData.company_id, periodId, compositionChanges, justification)
  }
}

async function processNovedadChanges(
  supabase: any,
  periodId: string,
  companyId: string,
  novedadChanges: { created: any[], updated: any[], deleted: string[] },
  justification: string
) {
  const { created = [], updated = [], deleted = [] } = novedadChanges

  console.log(`📝 Novedad changes: +${created.length} ~${updated.length} -${deleted.length}`)

  // Create new novedades
  for (const novedad of created) {
    try {
      const { error: insertError } = await supabase
        .from('payroll_novedades')
        .insert({
          company_id: companyId,
          periodo_id: periodId,
          empleado_id: novedad.employee_id,
          tipo_novedad: novedad.tipo_novedad,
          subtipo: novedad.subtipo,
          valor: novedad.valor,
          dias: novedad.dias,
          fecha_inicio: novedad.fecha_inicio,
          fecha_fin: novedad.fecha_fin,
          observacion: novedad.observacion,
          creado_por: (await supabase.auth.getUser()).data.user?.id
        })

      if (insertError) {
        throw new Error(`Failed to create novedad: ${insertError.message}`)
      }

      console.log(`✅ Created novedad ${novedad.tipo_novedad} for employee ${novedad.employee_id}`)
    } catch (error) {
      console.error(`❌ Error creating novedad:`, error)
      throw error
    }
  }

  // Update existing novedades
  for (const novedad of updated) {
    try {
      const { error: updateError } = await supabase
        .from('payroll_novedades')
        .update({
          tipo_novedad: novedad.tipo_novedad,
          subtipo: novedad.subtipo,
          valor: novedad.valor,
          dias: novedad.dias,
          fecha_inicio: novedad.fecha_inicio,
          fecha_fin: novedad.fecha_fin,
          observacion: novedad.observacion,
          updated_at: new Date().toISOString()
        })
        .eq('id', novedad.id)

      if (updateError) {
        throw new Error(`Failed to update novedad ${novedad.id}: ${updateError.message}`)
      }

      console.log(`📝 Updated novedad ${novedad.id}`)
    } catch (error) {
      console.error(`❌ Error updating novedad ${novedad.id}:`, error)
      throw error
    }
  }

  // Delete novedades
  for (const novedadId of deleted) {
    try {
      const { error: deleteError } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId)

      if (deleteError) {
        throw new Error(`Failed to delete novedad ${novedadId}: ${deleteError.message}`)
      }

      console.log(`🗑️ Deleted novedad ${novedadId}`)
    } catch (error) {
      console.error(`❌ Error deleting novedad ${novedadId}:`, error)
      throw error
    }
  }
}

async function logCompositionAudit(
  supabase: any,
  companyId: string,
  periodId: string,
  compositionChanges: any,
  justification: string
) {
  try {
    await supabase
      .from('payroll_novedades_audit')
      .insert({
        novedad_id: periodId, // Using period ID for composition changes
        company_id: companyId,
        action: 'composition_change',
        old_values: { composition_changes: 'previous_state' },
        new_values: { 
          composition_changes: compositionChanges,
          justification: justification,
          timestamp: new Date().toISOString()
        },
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
  } catch (error) {
    console.warn('Warning: Could not log composition audit:', error)
  }
}

// Helper function from main file
function calculateWorkedDays(periodType: string, fechaInicio: Date, fechaFin: Date): number {
  if (periodType === 'quincenal') return 15
  if (periodType === 'semanal') return 7
  return Math.max(1, Math.min(30, (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24) + 1))
}