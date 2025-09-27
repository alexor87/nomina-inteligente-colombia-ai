import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ VALORES OFICIALES CORREGIDOS 2025/2024
const OFFICIAL_VALUES = {
  '2025': {
    salarioMinimo: 1423500,
    auxilioTransporte: 200000,
    uvt: 49799
  },
  '2024': {
    salarioMinimo: 1300000,
    auxilioTransporte: 162000,
    uvt: 47065
  }
}

const getTransportAssistanceLimit = (year: string) => {
  const values = OFFICIAL_VALUES[year as keyof typeof OFFICIAL_VALUES] || OFFICIAL_VALUES['2025']
  return values.salarioMinimo * 2 // 2 SMMLV
}

// Calcular días trabajados según tipo de período
const calculateWorkedDays = (periodType: string, fechaInicio: Date, fechaFin: Date): number => {
  if (periodType === 'quincenal') return 15
  if (periodType === 'semanal') return 7
  return Math.max(1, Math.min(30, (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24) + 1))
}

// Convertir novedades al formato IBC
const convertNovedadesToIBC = (novedades: any[]): any[] => {
  return novedades.map(novedad => ({
    tipo_novedad: novedad.tipo_novedad,
    subtipo: novedad.subtipo,
    valor: novedad.valor || 0,
    dias: novedad.dias,
    constitutivo_salario: isNovedadConstitutiva(novedad.tipo_novedad, novedad.constitutivo_salario),
    ...novedad
  }))
}

// Determinar si una novedad es constitutiva de salario
const isNovedadConstitutiva = (tipoNovedad: string, valorExplicito?: boolean): boolean => {
  if (valorExplicito !== undefined) return valorExplicito
  
  const constitutivas = [
    'bonificacion', 'comision', 'horas_extra', 'recargo_nocturno',
    'recargo_dominical', 'recargo_festivo', 'auxilio_alimentacion',
    'otros_devengos', 'vacaciones', 'licencia_remunerada'
  ]
  
  return constitutivas.includes(tipoNovedad)
}

// Política de empresa por defecto
async function getCompanyPolicy(supabase: any): Promise<{ incapacity_policy: string }> {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('incapacity_policy')
      .single()

    if (!settingsError && settings && settings.incapacity_policy) {
      return { incapacity_policy: settings.incapacity_policy }
    }

    const { data: policies, error: policiesError } = await supabase
      .from('company_payroll_policies')
      .select('incapacity_policy')
      .single()

    if (!policiesError && policies && policies.incapacity_policy) {
      return { incapacity_policy: policies.incapacity_policy }
    }

    return { incapacity_policy: 'standard_2d_100_rest_66' }
  } catch (error) {
    return { incapacity_policy: 'standard_2d_100_rest_66' }
  }
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

    // Process each affected employee with proper calculation logic
    for (const employeeId of affectedEmployeeIds) {
      try {
        const employeeNovedades = novedades?.filter(n => n.empleado_id === employeeId) || []
        const employeePayroll = payrolls?.find(p => p.employee_id === employeeId)

        if (!employeePayroll) {
          errors.push(`Payroll not found for employee ${employeeId}`)
          continue
        }

        // Get employee data for proper calculation
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('salario_base, dias_trabajo')
          .eq('id', employeeId)
          .single()

        if (employeeError || !employeeData) {
          errors.push(`Employee data not found for ${employeeId}`)
          continue
        }

        // Calculate worked days based on period type
        const workedDays = calculateWorkedDays(
          periodData.tipo_periodo,
          new Date(periodData.fecha_inicio),
          new Date(periodData.fecha_fin)
        )

        // Convert novedades to proper IBC format
        const convertedNovedades = convertNovedadesToIBC(employeeNovedades)

        // Use proper payroll calculation logic
        const calculationInput = {
          baseSalary: employeeData.salario_base,
          workedDays: workedDays,
          extraHours: 0,
          disabilities: 0,
          bonuses: 0,
          absences: 0,
          periodType: periodData.tipo_periodo,
          novedades: convertedNovedades,
          year: new Date(periodData.fecha_inicio).getFullYear().toString()
        }

        // Calculate using proper backend logic
        const calculationResult = await calculatePayroll(supabase, calculationInput)

        const totalDevengado = calculationResult.grossPay
        const totalDeducciones = calculationResult.totalDeductions
        const netoCalculado = calculationResult.netPay

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ✅ CALCULATION LOGIC: Reuse the same logic as main payroll module
async function calculatePayroll(supabase: any, data: any) {
  const year = data.year || '2025'
  const config = OFFICIAL_VALUES[year as keyof typeof OFFICIAL_VALUES] || OFFICIAL_VALUES['2025']
  const policy = await getCompanyPolicy(supabase)
  
  const {
    baseSalary,
    workedDays,
    extraHours = 0,
    disabilities = 0,
    bonuses = 0,
    absences = 0,
    periodType,
    novedades = []
  } = data

  const dailySalary = baseSalary / 30
  const regularPay = (dailySalary * workedDays) - absences
  let extraPay = bonuses

  // Process novedades with policies
  let totalIncapacityValue = 0
  let totalIncapacityDays = 0
  let totalConstitutiveNovedades = 0

  for (const novedad of novedades) {
    if (novedad.tipo_novedad === 'incapacidad') {
      const incapacityValue = await calculateIncapacityWithPolicy(
        baseSalary, 
        novedad.dias || 0, 
        novedad.subtipo, 
        policy,
        config.salarioMinimo
      )
      totalIncapacityValue += incapacityValue
      totalIncapacityDays += novedad.dias || 0
    } else if (novedad.constitutivo_salario) {
      totalConstitutiveNovedades += novedad.valor || 0
    }
    
    extraPay += novedad.valor || 0
  }

  // Calculate transport allowance
  const transportLimit = getTransportAssistanceLimit(year)
  const eligibleForTransport = baseSalary <= transportLimit
  const workedDaysCapped = Math.max(0, Math.min(Number(workedDays) || 0, 30))
  const transportAllowance = eligibleForTransport ? Math.round((config.auxilioTransporte / 30) * workedDaysCapped) : 0

  const grossPay = regularPay + extraPay + transportAllowance

  // Calculate IBC
  let ibcSalud: number
  if (totalIncapacityDays > 0) {
    ibcSalud = totalIncapacityValue
  } else {
    const effectiveWorkedDays = Math.min(workedDays, 30)
    ibcSalud = Math.round((baseSalary / 30) * effectiveWorkedDays + totalConstitutiveNovedades)
  }

  const healthDeduction = Math.round(ibcSalud * 0.04)
  const pensionDeduction = Math.round(ibcSalud * 0.04)
  const totalDeductions = healthDeduction + pensionDeduction
  const netPay = grossPay - totalDeductions

  return {
    regularPay: Math.round(regularPay),
    extraPay: Math.round(extraPay),
    transportAllowance,
    grossPay: Math.round(grossPay),
    healthDeduction,
    pensionDeduction,
    totalDeductions,
    netPay: Math.round(netPay),
    ibc: ibcSalud
  }
}

async function calculateIncapacityWithPolicy(
  baseSalary: number, 
  days: number, 
  subtipo: string, 
  policy: any,
  smlv: number
): Promise<number> {
  if (!days || days <= 0) return 0

  const dailySalary = baseSalary / 30
  const normalizedSubtype = normalizeIncapacitySubtype(subtipo)
  
  if (normalizedSubtype === 'laboral') {
    return Math.round(dailySalary * days)
  }

  if (policy.incapacity_policy === 'from_day1_66_with_floor') {
    const daily66 = dailySalary * 0.6667
    const smldv = smlv / 30
    const appliedDaily = Math.max(daily66, smldv)
    return Math.round(appliedDaily * days)
  } else {
    if (days <= 2) {
      return Math.round(dailySalary * days)
    } else {
      const first2Days = dailySalary * 2
      const remainingDays = days - 2
      const daily66 = dailySalary * 0.6667
      const smldv = smlv / 30
      const appliedDaily = Math.max(daily66, smldv)
      return Math.round(first2Days + (appliedDaily * remainingDays))
    }
  }
}

function normalizeIncapacitySubtype(subtipo?: string): 'general' | 'laboral' {
  if (!subtipo) return 'general'
  const s = subtipo.toLowerCase().trim()

  if (['comun', 'común', 'enfermedad_general', 'eg', 'general'].includes(s)) {
    return 'general'
  }
  if (['laboral', 'arl', 'accidente_laboral', 'riesgo_laboral', 'at'].includes(s)) {
    return 'laboral'
  }
  return 'general'
}