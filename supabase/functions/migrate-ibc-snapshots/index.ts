import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RetroactiveSnapshot {
  ibc_base_salario: number
  ibc_novedades_constitutivas: any[]
  ibc_total: number
  ibc_delta_unknown: number
  fecha_calculo: string
  retroactive: true
  note: string
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

    console.log('🔄 Iniciando migración retroactiva de IBC snapshots...')

    // Buscar todos los payrolls sin snapshot
    const { data: payrollsWithoutSnapshot, error: fetchError } = await supabase
      .from('payrolls')
      .select('id, company_id, employee_id, periodo, period_id, salario_base, dias_trabajados, ibc, created_at')
      .is('ibc_snapshot', null)
      .not('ibc', 'is', null)

    if (fetchError) {
      console.error('❌ Error fetching payrolls:', fetchError)
      throw fetchError
    }

    if (!payrollsWithoutSnapshot || payrollsWithoutSnapshot.length === 0) {
      console.log('✅ No hay payrolls sin snapshot para migrar')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No hay payrolls sin snapshot',
          migrated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Encontrados ${payrollsWithoutSnapshot.length} payrolls sin snapshot`)

    let migrated = 0
    let errors: string[] = []

    // Procesar cada payroll
    for (const payroll of payrollsWithoutSnapshot) {
      try {
        // Calcular IBC base (salario proporcional a días trabajados)
        const ibcBaseSalario = (payroll.salario_base / 30) * payroll.dias_trabajados
        
        // Calcular delta desconocido (diferencia entre IBC real y base)
        const ibcDeltaUnknown = payroll.ibc - ibcBaseSalario

        // Crear snapshot retroactivo
        const retroactiveSnapshot: RetroactiveSnapshot = {
          ibc_base_salario: ibcBaseSalario,
          ibc_novedades_constitutivas: [], // No conocemos las novedades originales
          ibc_total: payroll.ibc, // Preservar el IBC correcto original
          ibc_delta_unknown: ibcDeltaUnknown, // Diferencia no explicada
          fecha_calculo: payroll.created_at,
          retroactive: true,
          note: 'Snapshot generado retroactivamente para preservar IBC histórico'
        }

        // Actualizar el payroll con el snapshot
        const { error: updateError } = await supabase
          .from('payrolls')
          .update({ ibc_snapshot: retroactiveSnapshot })
          .eq('id', payroll.id)

        if (updateError) {
          console.error(`❌ Error actualizando payroll ${payroll.id}:`, updateError)
          errors.push(`Error en ${payroll.id}: ${updateError.message}`)
          continue
        }

        migrated++
        
        if (migrated % 10 === 0) {
          console.log(`📈 Progreso: ${migrated}/${payrollsWithoutSnapshot.length} migrados`)
        }

        console.log(`✅ Snapshot retroactivo creado para payroll ${payroll.id}`, {
          periodo: payroll.periodo,
          ibc_base: ibcBaseSalario,
          ibc_total: payroll.ibc,
          delta_unknown: ibcDeltaUnknown
        })
      } catch (error) {
        console.error(`❌ Error procesando payroll ${payroll.id}:`, error)
        errors.push(`Error en ${payroll.id}: ${error.message}`)
      }
    }

    console.log(`✅ Migración completada: ${migrated} snapshots creados`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migración completada: ${migrated} snapshots retroactivos creados`,
        migrated,
        total: payrollsWithoutSnapshot.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error en migración:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
