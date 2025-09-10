
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

      // Get payroll data with employee info for IBC calculation
      const { data: payrollsData, error: payrollsDataError } = await supabaseClient
        .from('payrolls')
        .select(`
          *,
          employees!inner(salario_base)
        `)
        .eq('period_id', data.period_id)
        .eq('company_id', data.company_id)

      if (payrollsDataError) {
        throw new Error(`Error fetching payrolls data: ${payrollsDataError.message}`)
      }

      // Process each payroll to calculate and store accurate IBC
      for (const payroll of payrollsData || []) {
        try {
          const salarioBase = payroll.employees?.salario_base || 0
          const diasTrabajados = payroll.dias_trabajados || 30
          
          // Get novedades for this employee in this period
          const { data: novedades } = await supabaseClient
            .from('payroll_novedades')
            .select('tipo_novedad, valor')
            .eq('periodo_id', data.period_id)
            .eq('empleado_id', payroll.employee_id)

          // Calculate constitutive novedades
          const constitutiveTypes = ['horas_extra', 'recargo_nocturno', 'recargo_dominical', 'comision', 'bonificacion', 'vacaciones', 'licencia_remunerada', 'auxilio_conectividad']
          const novedadesConstitutivas = (novedades || [])
            .filter(n => constitutiveTypes.includes(n.tipo_novedad))
            .reduce((sum, n) => sum + (n.valor || 0), 0)

          // Calculate exact proportional IBC: (base_salary / 30 * dias_trabajados) + constitutive_novedades
          const ibcBase = (salarioBase / 30) * diasTrabajados
          let ibc = ibcBase + novedadesConstitutivas
          
          // Apply maximum cap only (25 SMMLV) - no minimum to preserve exact calculation
          const SMMLV_2025 = 1423500
          ibc = Math.min(ibc, SMMLV_2025 * 25)
          
          console.log(`🧮 IBC calculation for employee ${payroll.employee_id}: base=${ibcBase}, novedades=${novedadesConstitutivas}, final=${ibc}`)

          // Transport allowance prorated by worked days if base ≤ 2 SMMLV
          const transportAllowance = salarioBase <= (SMMLV_2025 * 2) ? Math.round((200000 / 30) * diasTrabajados) : 0

          // Deductions
          const healthDeduction = Math.round(ibc * 0.04)
          const pensionDeduction = Math.round(ibc * 0.04)

          // Solidarity fund
          let solidarityFund = 0
          if (ibc > SMMLV_2025 * 4) {
            solidarityFund = ibc <= SMMLV_2025 * 16 ? Math.round(ibc * 0.01) : Math.round(ibc * 0.012)
          }

          // Sum of all novedades (positive add to devengado, negative to deducciones)
          const totalNovedades = (novedades || []).reduce((sum, n) => sum + (Number(n.valor) || 0), 0)

          // Totals
          const salarioProporcionado = (salarioBase / 30) * diasTrabajados
          const totalDevengado = Math.round(salarioProporcionado + Math.max(0, totalNovedades) + transportAllowance)
          const totalDeducciones = Math.round(healthDeduction + pensionDeduction + solidarityFund + Math.abs(Math.min(0, totalNovedades)))
          let netoPagado = Math.round(totalDevengado - totalDeducciones)

          // Integrity check: enforce net = devengado - deducciones
          const expectedNet = Math.round(totalDevengado - totalDeducciones)
          if (Math.abs(netoPagado - expectedNet) > 0) {
            console.warn('⚠️ Net inconsistency detected, forcing consistency', { payrollId: payroll.id, netoPagado, expectedNet, totalDevengado, totalDeducciones })
            // Log to security audit log (RLS allows insert true)
            await supabaseClient.from('security_audit_log').insert({
              table_name: 'payrolls',
              action: 'NET_FIX',
              violation_type: 'net_inconsistency_fixed',
              additional_data: {
                payroll_id: payroll.id,
                employee_id: payroll.employee_id,
                previous_neto: netoPagado,
                expected_neto: expectedNet,
                total_devengado: totalDevengado,
                total_deducciones: totalDeducciones,
                period_id: data.period_id
              },
              user_id: null,
              company_id: data.company_id
            })
            netoPagado = expectedNet
          }

          console.log('✅ Atomic liquidation calc:', { payrollId: payroll.id, totalDevengado, totalDeducciones, netoPagado, transportAllowance, healthDeduction, pensionDeduction, solidarityFund })

          // Update payroll with calculated values
          await supabaseClient
            .from('payrolls')
            .update({ 
              estado: 'procesada',
              ibc: Math.round(ibc),
              auxilio_transporte: transportAllowance,
              salud_empleado: healthDeduction,
              pension_empleado: pensionDeduction,
              total_devengado: totalDevengado,
              total_deducciones: totalDeducciones,
              neto_pagado: netoPagado,
              updated_at: new Date().toISOString() 
            })
            .eq('id', payroll.id)

        } catch (employeeError) {
          console.error(`Error processing payroll ${payroll.id}:`, employeeError)
        }
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

      // ✅ Update period totals from payrolls to ensure header consistency
      try {
        const { data: totalsRows, error: totalsErr } = await supabaseClient
          .from('payrolls')
          .select('total_devengado,total_deducciones,neto_pagado')
          .eq('period_id', data.period_id)
          .eq('company_id', data.company_id)
        if (totalsErr) {
          console.warn('⚠️ No se pudieron leer los totales para el período:', totalsErr)
        } else if (totalsRows) {
          const totals = (totalsRows as any[]).reduce((acc, r) => ({
            dev: acc.dev + (Number(r.total_devengado) || 0),
            ded: acc.ded + (Number(r.total_deducciones) || 0),
            net: acc.net + (Number(r.neto_pagado) || 0),
          }), { dev: 0, ded: 0, net: 0 })

          await supabaseClient
            .from('payroll_periods_real')
            .update({
              total_devengado: totals.dev,
              total_deducciones: totals.ded,
              total_neto: totals.net,
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.period_id)

          console.log('📈 Totales de período actualizados:', totals)
        }
      } catch (totalsError) {
        console.error('❌ Error actualizando totales del período:', totalsError)
      }

      const liquidationResult = {
        success: true,
        employees_processed: processedCount || data.validated_employees || 0,
        vouchers_generated: processedCount || data.validated_employees || 0,
        period_id: data.period_id
      }

      console.log('✅ Liquidación atómica completada:', liquidationResult)

      // ✅ NUEVO: Provisiones automáticas integradas (sin llamar a otra función)
      const authHeader = req.headers.get('Authorization') || '';
      const executeBackgroundProvisioning = async () => {
        try {
          console.log('🔧 Iniciando provisiones automáticas integradas en background...')

          // Verificar configuración de la empresa
          const { data: companySettings, error: companySettingsErr } = await supabaseClient
            .from('company_settings')
            .select('provision_mode')
            .eq('company_id', data.company_id)
            .single()

          if (companySettingsErr) {
            console.warn('⚠️ No se pudo leer company_settings:', companySettingsErr.message)
          }

          if (companySettings?.provision_mode !== 'on_liquidation') {
            console.log('ℹ️ Provisiones no configuradas para ejecutar automáticamente')
            return
          }

          // Leer período (y validar cerrado)
          const { data: periodData, error: periodDataErr } = await supabaseClient
            .from('payroll_periods_real')
            .select('id, company_id, fecha_inicio, fecha_fin, tipo_periodo, periodo, estado')
            .eq('id', data.period_id)
            .single()

          if (periodDataErr || !periodData) {
            console.error('❌ No se pudo cargar el período para provisiones:', periodDataErr)
            return
          }

          if (periodData.estado !== 'cerrado') {
            console.log('❌ El período no está cerrado, se omiten provisiones')
            return
          }

          // Obtener payrolls del período
          const { data: payrolls, error: payrollsErr } = await supabaseClient
            .from('payrolls')
            .select('employee_id, dias_trabajados')
            .eq('period_id', periodData.id)
            .eq('company_id', periodData.company_id)

          if (payrollsErr) {
            console.error('❌ Error cargando payrolls para provisiones:', payrollsErr)
            return
          }

          if (!payrolls || payrolls.length === 0) {
            console.log('⚠️ No hay payrolls para calcular provisiones')
            return
          }

          // Obtener salarios de empleados
          const employeeIds = [...new Set((payrolls || []).map(p => p.employee_id))] as string[]
          const { data: employees, error: employeesErr } = await supabaseClient
            .from('employees')
            .select('id, salario_base')
            .in('id', employeeIds)

          if (employeesErr) {
            console.error('❌ Error cargando empleados para provisiones:', employeesErr)
            return
          }

          const employeesMap = new Map<string, { id: string; salario_base: number }>()
          ;(employees || []).forEach(emp => {
            employeesMap.set(emp.id as string, { id: emp.id as string, salario_base: Number(emp.salario_base) || 0 })
          })

          // Intentar identificar usuario que inició la liquidación (para created_by)
          let createdByUserId: string | null = null
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
            if (authHeader && supabaseUrl && supabaseAnonKey) {
              const userSb = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
              const { data: userData } = await userSb.auth.getUser()
              createdByUserId = userData?.user?.id ?? null
            }
          } catch (uErr) {
            console.warn('⚠️ No se pudo identificar el usuario que inició la liquidación:', uErr)
          }

          type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima' | 'vacaciones'
          type Row = {
            company_id: string
            employee_id: string
            benefit_type: BenefitType
            period_start: string
            period_end: string
            calculation_basis: any
            calculated_values: any
            amount: number
            estado: string
            notes: string
            created_by?: string | null
          }

          const SMMLV_2025 = 1300000
          const AUXILIO_TRANSPORTE_2025 = 200000
          const items: Row[] = []

          for (const p of payrolls || []) {
            const employeeId = p.employee_id as string
            const workedDays = Number(p.dias_trabajados) || 0
            const employee = employeesMap.get(employeeId)
            const salarioMensual = Number(employee?.salario_base) || 0

            if (!employeeId || workedDays <= 0 || salarioMensual <= 0) {
              console.log('⚠️ Omitiendo empleado con datos inválidos:', { employeeId, workedDays, salarioMensual })
              continue
            }

            const auxilioMensual = salarioMensual <= (2 * SMMLV_2025) ? AUXILIO_TRANSPORTE_2025 : 0
            const basePrestaciones = salarioMensual + auxilioMensual
            const fraction = workedDays / 360

            const cesantiasAmount = basePrestaciones * fraction
            const interesesAmount = cesantiasAmount * 0.12
            const primaAmount = basePrestaciones * fraction
            const vacacionesAmount = salarioMensual * workedDays / 720

            const calculation_basis = {
              version: "4_legal_2025",
              salario_mensual: salarioMensual,
              auxilio_mensual: auxilioMensual,
              base_prestaciones: basePrestaciones,
              full_monthly_salary: salarioMensual,            // Compatibilidad con UI
              full_monthly_auxilio: auxilioMensual,           // Compatibilidad con UI
              base_constitutiva_total: basePrestaciones,      // Compatibilidad con UI
              base_salary: salarioMensual,                    // Compatibilidad con UI
              transport_allowance: auxilioMensual,            // Compatibilidad con UI
              worked_days: workedDays,
              method: 'legal_monthly_base_proportional',
              smmlv_2025: SMMLV_2025,
              auxilio_transporte_2025: AUXILIO_TRANSPORTE_2025,
              legal_reference: "Ley 50/1990 Art. 99 - Intereses 12% anual sobre cesantías",
              period: {
                id: periodData.id,
                periodo: periodData.periodo,
                start: periodData.fecha_inicio,
                end: periodData.fecha_fin,
                tipo: periodData.tipo_periodo,
              },
            }

            const calculated_values_base = {
              days_count: workedDays,
              formulas: {
                cesantias: 'base_prestaciones * (dias/360)',
                intereses_cesantias: 'cesantias_amount * 0.12 (Ley 50/1990 Art. 99)',
                prima: 'base_prestaciones * (dias/360)',
                vacaciones: 'salario_mensual * (dias/720) - Solo salario base, sin auxilio',
              },
              calculation_method: 'legal_monthly_base_proportional',
              calculated_at: new Date().toISOString(),
            }

            const interestCalculatedValues = {
              ...calculated_values_base,
              rate_applied: 0.12,
              method: "12pct_of_cesantia_period",
              legal_basis: "Ley 50/1990 Art. 99",
              cesantia_del_periodo: Math.round(cesantiasAmount),
              calculation_detail: {
                step1_cesantia: `(${salarioMensual} + ${auxilioMensual}) * ${workedDays} / 360 = ${cesantiasAmount.toFixed(2)}`,
                step2_intereses: `${cesantiasAmount.toFixed(2)} * 0.12 = ${interesesAmount.toFixed(2)}`
              }
            }

            const common = {
              company_id: periodData.company_id,
              employee_id: employeeId,
              period_start: periodData.fecha_inicio,
              period_end: periodData.fecha_fin,
              calculation_basis,
              calculated_values: calculated_values_base,
              estado: 'calculado',
              notes: 'Provisión automática tras liquidación (Ley 50/1990 Art. 99)',
              created_by: createdByUserId || null,
            }

            items.push(
              { ...common, benefit_type: 'cesantias', amount: Math.round(cesantiasAmount) },
              { ...common, benefit_type: 'intereses_cesantias', amount: Math.round(interesesAmount), calculated_values: interestCalculatedValues },
              { ...common, benefit_type: 'prima', amount: Math.round(primaAmount) },
              { ...common, benefit_type: 'vacaciones', amount: Math.round(vacacionesAmount) },
            )
          }

          console.log('🧾 Ítems calculados para provisiones:', { count: items.length, employees: employeeIds.length })

          if (items.length === 0) {
            console.log('ℹ️ No hay ítems para registrar en provisiones')
            return
          }

          const { data: upserted, error: upsertErr } = await supabaseClient
            .from('social_benefit_calculations')
            .upsert(items, {
              onConflict: 'company_id,employee_id,benefit_type,period_start,period_end',
              ignoreDuplicates: false,
            })
            .select('id')

          if (upsertErr) {
            console.error('❌ Error guardando provisiones:', upsertErr)
            return
          }

          console.log('✅ Provisiones registradas automáticamente:', upserted?.length || 0)
        } catch (error) {
          console.error('❌ Error en provisiones integradas background:', error)
        }
      }

      // Ejecutar provisiones como tarea en background (sin bloquear la respuesta)
      EdgeRuntime.waitUntil(executeBackgroundProvisioning())

      return new Response(JSON.stringify({ success: true, liquidation: liquidationResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error(`Acción no válida: ${action}`)

  } catch (error: any) {
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
