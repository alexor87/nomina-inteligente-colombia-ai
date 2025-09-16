import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()
    console.log(`🔄 Recalculate Stale Payrolls Request: ${action}`, data)

    if (action === 'recalculate_stale_payrolls') {
      const { company_id, period_id } = data

      // Get stale payrolls for the company/period
      let query = supabaseClient
        .from('payrolls')
        .select(`
          id,
          employee_id,
          period_id,
          company_id,
          salario_base,
          dias_trabajados,
          employees!inner(nombre, apellido, salario_base)
        `)
        .eq('company_id', company_id)
        .eq('is_stale', true)

      if (period_id) {
        query = query.eq('period_id', period_id)
      }

      const { data: stalePayrolls, error: payrollError } = await query

      if (payrollError) {
        throw new Error(`Error fetching stale payrolls: ${payrollError.message}`)
      }

      console.log(`📊 Found ${stalePayrolls?.length || 0} stale payrolls to recalculate`)

      let recalculatedCount = 0
      let errors: string[] = []

      for (const payroll of stalePayrolls || []) {
        try {
          // Get employee's novedades for this period
          const { data: novedades, error: novedadesError } = await supabaseClient
            .from('payroll_novedades')
            .select('*')
            .eq('company_id', company_id)
            .eq('empleado_id', payroll.employee_id)
            .eq('periodo_id', payroll.period_id)

          if (novedadesError) {
            console.error(`Error fetching novedades for employee ${payroll.employee_id}:`, novedadesError)
            errors.push(`Employee ${payroll.employee_id}: ${novedadesError.message}`)
            continue
          }

          // Get period info for calculation
          const { data: period, error: periodError } = await supabaseClient
            .from('payroll_periods_real')
            .select('*')
            .eq('id', payroll.period_id)
            .single()

          if (periodError) {
            console.error(`Error fetching period ${payroll.period_id}:`, periodError)
            errors.push(`Period ${payroll.period_id}: ${periodError.message}`)
            continue
          }

          // Prepare data for payroll calculation
          const calculationData = {
            baseSalary: payroll.employees.salario_base,
            workedDays: payroll.dias_trabajados || 30,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: period.tipo_periodo,
            novedades: novedades?.map(n => ({
              valor: n.valor,
              constitutivo_salario: n.tipo_novedad !== 'ausencia',
              tipo_novedad: n.tipo_novedad,
              subtipo: n.subtipo
            })) || [],
            year: new Date(period.fecha_inicio).getFullYear().toString()
          }

          console.log(`🧮 Recalculating payroll for employee ${payroll.employee_id}:`, calculationData)

          // Call payroll calculation function
          const { data: calculationResult, error: calcError } = await supabaseClient.functions.invoke(
            'payroll-calculations',
            {
              body: {
                action: 'calculate',
                data: calculationData
              }
            }
          )

          if (calcError) {
            console.error(`Calculation error for employee ${payroll.employee_id}:`, calcError)
            errors.push(`Employee ${payroll.employee_id}: Calculation failed - ${calcError.message}`)
            continue
          }

          // Create version history snapshot before updating
          const { error: versionError } = await supabaseClient
            .from('payroll_version_history')
            .insert({
              company_id: company_id,
              period_id: payroll.period_id,
              version_type: 'auto_recalculation',
              changes_summary: `Auto-recalculation due to novedad changes. Novedades count: ${novedades?.length || 0}`,
              snapshot_data: {
                payroll_id: payroll.id,
                employee_id: payroll.employee_id,
                previous_values: payroll,
                new_values: calculationResult,
                novedades_applied: novedades
              },
              created_by: null // System generated
            })

          if (versionError) {
            console.warn(`Warning: Could not create version history for payroll ${payroll.id}:`, versionError)
          }

          // Update the payroll record with recalculated values
          const { error: updateError } = await supabaseClient
            .from('payrolls')
            .update({
              total_devengado: calculationResult.grossPay,
              total_deducciones: calculationResult.totalDeductions,
              neto_pagado: calculationResult.netPay,
              auxilio_transporte: calculationResult.transportAllowance,
              deduccion_salud: calculationResult.healthDeduction,
              deduccion_pension: calculationResult.pensionDeduction,
              ibc_salud: calculationResult.ibcSalud,
              is_stale: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', payroll.id)

          if (updateError) {
            console.error(`Error updating payroll ${payroll.id}:`, updateError)
            errors.push(`Payroll ${payroll.id}: Update failed - ${updateError.message}`)
            continue
          }

          // Record the correction
          const { error: correctionError } = await supabaseClient
            .from('payroll_period_corrections')
            .insert({
              company_id: company_id,
              period_id: payroll.period_id,
              employee_id: payroll.employee_id,
              correction_type: 'auto_recalculation',
              concept: 'Recalculation due to novedad changes',
              justification: `Automatic recalculation triggered by stale payroll. Applied ${novedades?.length || 0} novedades.`,
              previous_value: payroll.neto_pagado || 0,
              new_value: calculationResult.netPay,
              value_difference: (calculationResult.netPay || 0) - (payroll.neto_pagado || 0),
              created_by: null // System generated
            })

          if (correctionError) {
            console.warn(`Warning: Could not record correction for payroll ${payroll.id}:`, correctionError)
          }

          recalculatedCount++
          console.log(`✅ Successfully recalculated payroll for employee ${payroll.employee_id}`)

        } catch (error) {
          console.error(`Error processing payroll ${payroll.id}:`, error)
          errors.push(`Payroll ${payroll.id}: ${error.message}`)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Recalculated ${recalculatedCount} payrolls`,
          recalculated_count: recalculatedCount,
          errors: errors.length > 0 ? errors : undefined
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (action === 'get_stale_payrolls') {
      const { company_id } = data

      const { data: stalePayrolls, error } = await supabaseClient
        .rpc('get_stale_payrolls_for_company', { p_company_id: company_id })

      if (error) {
        throw new Error(`Error getting stale payrolls: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          stale_payrolls: stalePayrolls || []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )

  } catch (error) {
    console.error('🚨 Error in recalculate-stale-payrolls function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})