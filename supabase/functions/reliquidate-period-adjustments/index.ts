import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReliquidationRequest {
  periodId: string
  affectedEmployeeIds: string[]
  justification: string
}

interface ReliquidationResponse {
  success: boolean
  employeesAffected: number
  correctionsApplied: number
  message: string
  errors?: string[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { periodId, affectedEmployeeIds, justification }: ReliquidationRequest = await req.json()

    console.log('🔄 Starting period reliquidation:', { periodId, affectedEmployeeIds: affectedEmployeeIds.length })

    // Validate period exists and get period info
    const { data: periodData, error: periodError } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', periodId)
      .single()

    if (periodError || !periodData) {
      throw new Error(`Período no encontrado: ${periodError?.message}`)
    }

    // Get all payroll novedades for affected employees in this period
    const { data: novedades, error: novedadesError } = await supabase
      .from('payroll_novedades')
      .select('*')
      .eq('periodo_id', periodId)
      .in('empleado_id', affectedEmployeeIds)

    if (novedadesError) {
      throw new Error(`Error obteniendo novedades: ${novedadesError.message}`)
    }

    // Get payroll records for affected employees
    const { data: payrolls, error: payrollsError } = await supabase
      .from('payrolls')
      .select('*')
      .eq('period_id', periodId)
      .in('employee_id', affectedEmployeeIds)

    if (payrollsError) {
      throw new Error(`Error obteniendo payrolls: ${payrollsError.message}`)
    }

    console.log(`📊 Found ${novedades?.length || 0} novedades and ${payrolls?.length || 0} payroll records`)

    let employeesAffected = 0
    let correctionsApplied = 0
    const errors: string[] = []

    // Process each affected employee
    for (const employeeId of affectedEmployeeIds) {
      try {
        const employeeNovedades = novedades?.filter(n => n.empleado_id === employeeId) || []
        const employeePayroll = payrolls?.find(p => p.employee_id === employeeId)

        if (!employeePayroll) {
          errors.push(`Payroll not found for employee ${employeeId}`)
          continue
        }

        // Calculate totals from novedades
        let totalDevengado = employeePayroll.salario_base || 0
        let totalDeducciones = 0

        // Sum up devengados (earnings)
        const devengadoTypes = ['bonificacion', 'comision', 'horas_extra', 'auxilio_transporte', 'otros_devengos']
        const deduccionTypes = ['descuento_varios', 'retencion_fuente']

        employeeNovedades.forEach(novedad => {
          if (devengadoTypes.includes(novedad.tipo_novedad)) {
            totalDevengado += Number(novedad.valor || 0)
          } else if (deduccionTypes.includes(novedad.tipo_novedad)) {
            totalDeducciones += Number(novedad.valor || 0)
          }
        })

        // Calculate basic deductions (health + pension = ~8% of salary)
        const basicDeductions = (employeePayroll.salario_base || 0) * 0.08
        totalDeducciones += basicDeductions

        const netoCalculado = totalDevengado - totalDeducciones

        // Update payroll record
        const { error: updateError } = await supabase
          .from('payrolls')
          .update({
            total_devengado: totalDevengado,
            total_deducciones: totalDeducciones,
            neto_pagado: netoCalculado,
            is_stale: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', employeePayroll.id)

        if (updateError) {
          errors.push(`Error updating payroll for employee ${employeeId}: ${updateError.message}`)
          continue
        }

        // Create correction record
        const { error: correctionError } = await supabase
          .from('payroll_period_corrections')
          .insert({
            company_id: periodData.company_id,
            period_id: periodId,
            employee_id: employeeId,
            previous_value: employeePayroll.neto_pagado,
            new_value: netoCalculado,
            value_difference: netoCalculado - (employeePayroll.neto_pagado || 0),
            correction_type: 'reliquidation',
            concept: 'Reliquidación por aplicación de ajustes pendientes',
            justification: justification,
            created_by: (await supabase.auth.getUser()).data.user?.id
          })

        if (correctionError) {
          console.warn(`Warning: Could not create correction record for employee ${employeeId}:`, correctionError)
        } else {
          correctionsApplied++
        }

        employeesAffected++

      } catch (employeeError) {
        console.error(`Error processing employee ${employeeId}:`, employeeError)
        errors.push(`Error processing employee ${employeeId}: ${employeeError.message}`)
      }
    }

    // Update period totals
    const { error: periodUpdateError } = await supabase
      .from('payroll_periods_real')
      .update({
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', periodId)

    if (periodUpdateError) {
      console.warn('Warning: Could not update period timestamps:', periodUpdateError)
    }

    // Create version history record
    try {
      const { error: versionError } = await supabase
        .from('payroll_version_history')
        .insert({
          company_id: periodData.company_id,
          period_id: periodId,
          version_type: 'reliquidation',
          changes_summary: `Reliquidación: ${employeesAffected} empleados afectados, ${correctionsApplied} correcciones aplicadas`,
          snapshot_data: {
            employees_affected: affectedEmployeeIds,
            justification: justification,
            timestamp: new Date().toISOString()
          },
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (versionError) {
        console.warn('Warning: Could not create version history:', versionError)
      }
    } catch (versionHistoryError) {
      console.warn('Warning: Version history creation failed:', versionHistoryError)
    }

    console.log('✅ Reliquidation completed:', { employeesAffected, correctionsApplied, errors: errors.length })

    const response: ReliquidationResponse = {
      success: true,
      employeesAffected,
      correctionsApplied,
      message: `Reliquidación completada: ${employeesAffected} empleados procesados, ${correctionsApplied} correcciones aplicadas`,
      errors: errors.length > 0 ? errors : undefined
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Reliquidation failed:', error)

    const errorResponse: ReliquidationResponse = {
      success: false,
      employeesAffected: 0,
      correctionsApplied: 0,
      message: `Error en reliquidación: ${error.message}`
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Note': 'application/json' },
    })
  }
})