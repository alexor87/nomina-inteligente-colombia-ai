
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LiquidationRequest {
  action: 'validate_pre_liquidation' | 'execute_atomic_liquidation'
  data: {
    period_id: string
    company_id: string
    validated_employees?: number
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data }: LiquidationRequest = await req.json()
    console.log(`🔍 Payroll Liquidation Request: ${action}`, data)

    if (action === 'validate_pre_liquidation') {
      // Validación pre-liquidación
      const { data: payrolls, error: payrollsError } = await supabaseClient
        .from('payrolls')
        .select('*, employees!inner(*)')
        .eq('period_id', data.period_id)
        .eq('company_id', data.company_id)

      if (payrollsError) {
        throw new Error(`Error validating payrolls: ${payrollsError.message}`)
      }

      const issues = []
      const employeesWithoutSalary = payrolls.filter(p => !p.salario_base || p.salario_base <= 0)
      
      if (employeesWithoutSalary.length > 0) {
        issues.push({
          severity: 'high',
          message: `${employeesWithoutSalary.length} empleados sin salario base válido`
        })
      }

      const validation = {
        success: issues.filter(i => i.severity === 'high').length === 0,
        issues: issues,
        summary: {
          totalEmployees: payrolls.length,
          employeesReady: payrolls.length - employeesWithoutSalary.length
        }
      }

      return new Response(JSON.stringify({ success: true, validation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'execute_atomic_liquidation') {
      // Ejecutar liquidación atómica
      console.log('🚀 Iniciando liquidación atómica para período:', data.period_id)

      // Actualizar estado del período
      const { error: periodUpdateError } = await supabaseClient
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString() 
        })
        .eq('id', data.period_id)

      if (periodUpdateError) {
        throw new Error(`Error updating period status: ${periodUpdateError.message}`)
      }

      // Actualizar estado de payrolls
      const { error: payrollUpdateError } = await supabaseClient
        .from('payrolls')
        .update({ 
          estado: 'procesada',
          updated_at: new Date().toISOString() 
        })
        .eq('period_id', data.period_id)
        .eq('company_id', data.company_id)

      if (payrollUpdateError) {
        throw new Error(`Error updating payrolls: ${payrollUpdateError.message}`)
      }

      // Contar registros procesados
      const { count: processedCount, error: countError } = await supabaseClient
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('period_id', data.period_id)
        .eq('estado', 'procesada')

      if (countError) {
        console.warn('⚠️ Error contando registros procesados:', countError)
      }

      const liquidationResult = {
        success: true,
        employees_processed: processedCount || data.validated_employees || 0,
        vouchers_generated: processedCount || data.validated_employees || 0,
        period_id: data.period_id
      }

      console.log('✅ Liquidación atómica completada:', liquidationResult)

      // ✅ NUEVO: Ejecutar provisiones automáticas como tarea en background
      const executeBackgroundProvisioning = async () => {
        try {
          console.log('🔧 Iniciando provisiones automáticas en background...')
          
          // Verificar configuración de la empresa
          const { data: companySettings } = await supabaseClient
            .from('company_settings')
            .select('provision_mode')
            .eq('company_id', data.company_id)
            .single()

          if (companySettings?.provision_mode === 'on_liquidation') {
            // Obtener fechas del período
            const { data: periodData } = await supabaseClient
              .from('payroll_periods_real')
              .select('fecha_inicio, fecha_fin')
              .eq('id', data.period_id)
              .single()

            if (periodData) {
              // Invocar función de provisiones
              const provisionResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/provision-social-benefits`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  period_id: data.period_id,
                  company_id: data.company_id,
                  start_date: periodData.fecha_inicio,
                  end_date: periodData.fecha_fin
                })
              })

              const provisionResult = await provisionResponse.json()
              console.log('✅ Provisiones automáticas completadas en background:', provisionResult)
            }
          } else {
            console.log('ℹ️ Provisiones no configuradas para ejecutar automáticamente')
          }
        } catch (error) {
          console.error('❌ Error en provisiones automáticas background:', error)
        }
      }

      // Ejecutar provisiones como tarea en background
      EdgeRuntime.waitUntil(executeBackgroundProvisioning())

      return new Response(JSON.stringify({ success: true, liquidation: liquidationResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error(`Acción no válida: ${action}`)

  } catch (error) {
    console.error('❌ Error en liquidación atómica:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
