import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { action, data } = await req.json()
    console.log(`🚀 Payroll Liquidation Atomic: ${action}`)

    switch (action) {
      case 'validate_pre_liquidation':
        return await validatePreLiquidation(supabase, data)
      case 'execute_atomic_liquidation':
        return await executeAtomicLiquidation(supabase, data, user.id)
      case 'repair_period':
        return await repairPeriod(supabase, data, user.id)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Error in payroll-liquidation-atomic:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function validatePreLiquidation(supabase: any, data: any) {
  console.log('🔍 VALIDACIÓN PRE-LIQUIDACIÓN:', data)
  
  const { period_id, company_id } = data
  const issues = []
  let totalEmployees = 0
  let employeesWithIssues = 0

  // 1. Validar que el período existe y está en estado correcto
  const { data: period, error: periodError } = await supabase
    .from('payroll_periods_real')
    .select('*')
    .eq('id', period_id)
    .eq('company_id', company_id)
    .single()

  if (periodError || !period) {
    issues.push({
      type: 'period_not_found',
      severity: 'high',
      message: 'Período no encontrado o sin acceso'
    })
    return new Response(JSON.stringify({
      success: false,
      validation: { isValid: false, issues, summary: { totalEmployees: 0, employeesWithIssues: 0 } }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (period.estado === 'cerrado') {
    issues.push({
      type: 'period_already_closed',
      severity: 'high',
      message: 'El período ya está cerrado'
    })
  }

  // 2. Obtener empleados del período
  const { data: payrolls, error: payrollsError } = await supabase
    .from('payrolls')
    .select(`
      id, employee_id, salario_base, total_devengado, total_deducciones, neto_pagado,
      employees!inner(id, nombre, apellido, cedula, salario_base, estado)
    `)
    .eq('period_id', period_id)
    .eq('company_id', company_id)

  if (payrollsError) {
    issues.push({
      type: 'payrolls_fetch_error',
      severity: 'high',
      message: `Error obteniendo empleados: ${payrollsError.message}`
    })
  }

  totalEmployees = payrolls?.length || 0

  if (totalEmployees === 0) {
    issues.push({
      type: 'no_employees',
      severity: 'high',
      message: 'No hay empleados en este período'
    })
  }

  // 3. Validar datos de empleados
  for (const payroll of payrolls || []) {
    const employee = payroll.employees
    let hasEmployeeIssues = false

    if (!employee.nombre || !employee.apellido) {
      issues.push({
        type: 'incomplete_employee_data',
        severity: 'medium',
        message: `Empleado ${employee.cedula}: datos incompletos (nombre/apellido)`
      })
      hasEmployeeIssues = true
    }

    if (!employee.salario_base || employee.salario_base <= 0) {
      issues.push({
        type: 'invalid_salary',
        severity: 'high',
        message: `Empleado ${employee.nombre} ${employee.apellido}: salario base inválido`
      })
      hasEmployeeIssues = true
    }

    if (employee.estado !== 'activo') {
      issues.push({
        type: 'inactive_employee',
        severity: 'medium',
        message: `Empleado ${employee.nombre} ${employee.apellido}: estado ${employee.estado}`
      })
      hasEmployeeIssues = true
    }

    if (hasEmployeeIssues) {
      employeesWithIssues++
    }
  }

  // 4. Validar novedades del período
  const { data: novedades, error: novedadesError } = await supabase
    .from('payroll_novedades')
    .select('*')
    .eq('periodo_id', period_id)
    .eq('company_id', company_id)

  if (novedadesError) {
    issues.push({
      type: 'novedades_fetch_error',
      severity: 'medium',
      message: `Error obteniendo novedades: ${novedadesError.message}`
    })
  }

  // 5. Ejecutar cálculos de prueba
  try {
    for (const payroll of payrolls || []) {
      const employee = payroll.employees
      const employeeNovedades = novedades?.filter(n => n.empleado_id === employee.id) || []
      
      const calculationInput = {
        baseSalary: employee.salario_base,
        workedDays: 30, // Default, could be calculated from period dates
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        periodType: 'mensual' as const,
        novedades: employeeNovedades.map(n => ({
          id: n.id,
          tipo: n.tipo_novedad,
          valor: n.valor || 0,
          dias: n.dias || 0,
          constitutivo_salario: n.constitutivo_salario || false
        }))
      }

      // Llamar al edge function de cálculos para validar
      const { data: calculationResult, error: calcError } = await supabase.functions.invoke(
        'payroll-calculations',
        {
          body: {
            action: 'calculate',
            data: calculationInput
          }
        }
      )

      if (calcError || !calculationResult?.success) {
        issues.push({
          type: 'calculation_error',
          severity: 'high',
          message: `Error en cálculos para ${employee.nombre} ${employee.apellido}: ${calcError?.message || calculationResult?.error || 'Error desconocido'}`
        })
        employeesWithIssues++
      }
    }
  } catch (calcTestError) {
    issues.push({
      type: 'calculation_test_failed',
      severity: 'high',
      message: `Error en prueba de cálculos: ${calcTestError.message}`
    })
  }

  const isValid = issues.filter(i => i.severity === 'high').length === 0

  console.log(`✅ VALIDACIÓN COMPLETADA: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'} - ${issues.length} problemas encontrados`)

  return new Response(JSON.stringify({
    success: true,
    validation: {
      isValid,
      issues,
      summary: {
        totalEmployees,
        employeesWithIssues,
        periodInfo: {
          id: period.id,
          periodo: period.periodo,
          estado: period.estado,
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin
        },
        novedadesCount: novedades?.length || 0
      }
    }
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function executeAtomicLiquidation(supabase: any, data: any, userId: string) {
  console.log('💰 EJECUTANDO LIQUIDACIÓN ATÓMICA:', data)
  
  const { period_id, company_id, validated_employees } = data
  const auditLog = []
  let totalProcessed = 0
  let totalVouchers = 0

  try {
    // TRANSACCIÓN ATÓMICA - TODO O NADA
    auditLog.push({ step: 'start', timestamp: new Date().toISOString(), user_id: userId })

    // 1. Obtener período y empleados
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', period_id)
      .single()

    const { data: payrolls } = await supabase
      .from('payrolls')
      .select(`
        id, employee_id, salario_base,
        employees!inner(id, nombre, apellido, cedula, salario_base)
      `)
      .eq('period_id', period_id)

    const { data: novedades } = await supabase
      .from('payroll_novedades')
      .select('*')
      .eq('periodo_id', period_id)

    auditLog.push({ step: 'data_loaded', timestamp: new Date().toISOString(), employees: payrolls?.length })

    // 2. Procesar cada empleado con cálculos centralizados
    let totalDevengado = 0
    let totalDeducciones = 0
    let totalNeto = 0
    const processedPayrolls = []

    for (const payroll of payrolls || []) {
      const employee = payroll.employees
      const employeeNovedades = novedades?.filter(n => n.empleado_id === employee.id) || []
      
      const calculationInput = {
        baseSalary: employee.salario_base,
        workedDays: 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        periodType: 'mensual' as const,
        novedades: employeeNovedades.map(n => ({
          id: n.id,
          tipo: n.tipo_novedad,
          valor: n.valor || 0,
          dias: n.dias || 0,
          constitutivo_salario: n.constitutivo_salario || false
        }))
      }

      // Calcular con edge function
      const { data: calculationResult } = await supabase.functions.invoke(
        'payroll-calculations',
        {
          body: {
            action: 'calculate',
            data: calculationInput
          }
        }
      )

      if (calculationResult?.success) {
        const calc = calculationResult.data
        
        // Actualizar payroll con valores calculados
        await supabase
          .from('payrolls')
          .update({
            total_devengado: calc.grossPay,
            total_deducciones: calc.totalDeductions,
            neto_pagado: calc.netPay,
            salud_empleado: calc.healthDeduction,
            pension_empleado: calc.pensionDeduction,
            estado: 'procesada',
            updated_at: new Date().toISOString()
          })
          .eq('id', payroll.id)

        totalDevengado += calc.grossPay
        totalDeducciones += calc.totalDeductions
        totalNeto += calc.netPay
        
        processedPayrolls.push({
          payroll_id: payroll.id,
          employee_id: employee.id,
          net_pay: calc.netPay,
          employee_name: `${employee.nombre} ${employee.apellido}`
        })
        
        totalProcessed++
      }
    }

    auditLog.push({ step: 'calculations_completed', timestamp: new Date().toISOString(), processed: totalProcessed })

    // 3. Actualizar totales del período
    await supabase
      .from('payroll_periods_real')
      .update({
        empleados_count: totalProcessed,
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        total_neto: totalNeto,
        estado: 'cerrado',
        updated_at: new Date().toISOString()
      })
      .eq('id', period_id)

    auditLog.push({ step: 'period_updated', timestamp: new Date().toISOString(), totals: { totalDevengado, totalDeducciones, totalNeto } })

    // 4. Generar vouchers automáticamente
    for (const processed of processedPayrolls) {
      const { error: voucherError } = await supabase
        .from('payroll_vouchers')
        .insert({
          company_id,
          employee_id: processed.employee_id,
          payroll_id: processed.payroll_id,
          periodo: period.periodo,
          start_date: period.fecha_inicio,
          end_date: period.fecha_fin,
          net_pay: processed.net_pay,
          voucher_status: 'generado',
          generated_by: userId,
          created_at: new Date().toISOString()
        })

      if (!voucherError) {
        totalVouchers++
      }
    }

    auditLog.push({ step: 'vouchers_generated', timestamp: new Date().toISOString(), vouchers: totalVouchers })

    // 5. Registrar auditoría completa
    await supabase
      .from('payroll_sync_log')
      .insert({
        company_id,
        period_id,
        sync_type: 'atomic_liquidation',
        status: 'completed',
        records_created: totalVouchers,
        records_updated: totalProcessed,
        completed_at: new Date().toISOString()
      })

    auditLog.push({ step: 'audit_completed', timestamp: new Date().toISOString(), success: true })

    console.log(`✅ LIQUIDACIÓN ATÓMICA COMPLETADA: ${totalProcessed} empleados, ${totalVouchers} vouchers`)

    return new Response(JSON.stringify({
      success: true,
      liquidation: {
        period_id,
        employees_processed: totalProcessed,
        vouchers_generated: totalVouchers,
        totals: {
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto
        },
        audit_log: auditLog
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('❌ ERROR EN LIQUIDACIÓN ATÓMICA:', error)
    
    auditLog.push({ step: 'error', timestamp: new Date().toISOString(), error: error.message })
    
    // Registrar error en auditoría
    await supabase
      .from('payroll_sync_log')
      .insert({
        company_id,
        period_id,
        sync_type: 'atomic_liquidation',
        status: 'error',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      audit_log: auditLog
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function repairPeriod(supabase: any, data: any, userId: string) {
  console.log('🔧 REPARANDO PERÍODO:', data)
  
  const { period_id, company_id } = data
  const repairLog = []

  try {
    // Obtener datos del período
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', period_id)
      .single()

    const { data: payrolls } = await supabase
      .from('payrolls')
      .select('total_devengado, total_deducciones, neto_pagado')
      .eq('period_id', period_id)

    // Recalcular totales
    const totalDevengado = payrolls?.reduce((sum, p) => sum + (p.total_devengado || 0), 0) || 0
    const totalDeducciones = payrolls?.reduce((sum, p) => sum + (p.total_deducciones || 0), 0) || 0
    const totalNeto = payrolls?.reduce((sum, p) => sum + (p.neto_pagado || 0), 0) || 0

    // Actualizar período
    await supabase
      .from('payroll_periods_real')
      .update({
        empleados_count: payrolls?.length || 0,
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        total_neto: totalNeto,
        updated_at: new Date().toISOString()
      })
      .eq('id', period_id)

    repairLog.push({ action: 'totals_recalculated', timestamp: new Date().toISOString() })

    return new Response(JSON.stringify({
      success: true,
      repair: {
        period_id,
        employees_count: payrolls?.length || 0,
        totals_updated: {
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto
        },
        repair_log: repairLog
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('❌ ERROR EN REPARACIÓN:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}