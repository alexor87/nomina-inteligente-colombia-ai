import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()
    
    console.log('🚀 [EDGE v6.0] Request received:', { action })

    if (action === 'calculate-novedad') {
      // ✅ LOGGING DEFENSIVO CRÍTICO
      console.log('🔍 [NOVEDAD CALC] Input received:', {
        tipoNovedad: data.tipoNovedad,
        subtipo: data.subtipo,
        salarioBase: data.salarioBase,
        dias: data.dias,
        horas: data.horas,
        fechaPeriodo: data.fechaPeriodo
      })

      // ✅ DETECCIÓN DE INCONSISTENCIA CRÍTICA
      if (data.tipoNovedad === 'incapacidad' && (!data.dias || data.dias === 0)) {
        console.log('🚨 [INCAPACIDAD BUG] Días = 0 detectado para incapacidad:', {
          salarioBase: data.salarioBase,
          subtipo: data.subtipo,
          fechaPeriodo: data.fechaPeriodo
        })
        
        // Si no hay días pero sí hay salario, probablemente es un error de frontend
        if (data.salarioBase > 0) {
          console.log('⚠️ [INCAPACIDAD] Frontend envió días = 0, retornando error descriptivo')
          return new Response(
            JSON.stringify({
              success: false,
              error: 'CRITICAL: Incapacidad recibida con días = 0. Verificar cálculo de días en frontend.',
              debug: {
                receivedData: data,
                expectedDias: '> 0',
                actualDias: data.dias
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
      }

      const result = await calculateNovedad(data)
      
      // ✅ LOGGING DE RESULTADO
      console.log('📊 [NOVEDAD CALC] Resultado:', {
        tipo: data.tipoNovedad,
        valor: result?.valor || 0,
        success: !!result
      })

      if (!result) {
        return new Response(
          JSON.stringify({ success: false, error: 'Error en cálculo de novedad' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'calculate') {
      const result = await calculatePayroll(data)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'validate') {
      const result = await validateEmployee(data)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ success: false, error: 'Acción no reconocida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [EDGE ERROR]:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function calculateNovedad(data: any) {
  const { tipoNovedad, subtipo, salarioBase, horas, dias, fechaPeriodo } = data

  console.log('🔍 [CALC NOVEDAD] Iniciando cálculo:', {
    tipo: tipoNovedad,
    subtipo,
    salarioBase,
    horas,
    dias
  })

  // Validaciones básicas
  if (!salarioBase || salarioBase <= 0) {
    console.log('❌ [CALC] Salario inválido:', salarioBase)
    return null
  }

  // ✅ CORRECCIÓN CRÍTICA PARA INCAPACIDADES
  if (tipoNovedad === 'incapacidad') {
    console.log('🏥 [INCAPACIDAD] Procesando cálculo:', {
      subtipo: subtipo || 'general',
      dias,
      salarioBase
    })

    if (!dias || dias <= 0) {
      console.log('❌ [INCAPACIDAD] Días inválidos para incapacidad:', dias)
      return {
        valor: 0,
        factorCalculo: 0,
        detalleCalculo: `Error: Incapacidad con ${dias} días. Debe ser > 0.`,
        jornadaInfo: getJornadaInfo(salarioBase)
      }
    }

    const valorHoraDiaria = salarioBase / 30
    let valor = 0
    let factorCalculo = 0
    let detalleCalculo = ''

    // Cálculo según normativa colombiana
    if (subtipo === 'laboral') {
      // ARL paga 100% desde día 1
      valor = valorHoraDiaria * dias
      factorCalculo = 1.0
      detalleCalculo = `Incapacidad laboral: ${dias} días × $${valorHoraDiaria.toFixed(0)} × 100% = $${valor.toFixed(0)}`
    } else {
      // EPS: empleador paga 66.67% desde día 4
      if (dias <= 3) {
        valor = 0
        factorCalculo = 0
        detalleCalculo = `Incapacidad general: ${dias} días (empleador paga primeros 3 días, EPS desde día 4)`
      } else {
        const diasEps = dias - 3
        valor = valorHoraDiaria * diasEps * 0.6667
        factorCalculo = 0.6667
        detalleCalculo = `Incapacidad general: ${diasEps} días EPS × $${valorHoraDiaria.toFixed(0)} × 66.67% = $${valor.toFixed(0)}`
      }
    }

    console.log('✅ [INCAPACIDAD] Cálculo completado:', {
      valor,
      factorCalculo,
      detalleCalculo
    })

    return {
      valor: Math.round(valor),
      factorCalculo,
      detalleCalculo,
      jornadaInfo: getJornadaInfo(salarioBase)
    }
  }

  if (tipoNovedad === 'vacaciones') {
    console.log('🏖️ [VACACIONES] Procesando cálculo:', {
      dias,
      salarioBase
    })

    if (!dias || dias <= 0) {
      console.log('❌ [VACACIONES] Días inválidos para vacaciones:', dias)
      return {
        valor: 0,
        factorCalculo: 0,
        detalleCalculo: `Error: Vacaciones con ${dias} días. Debe ser > 0.`,
        jornadaInfo: getJornadaInfo(salarioBase)
      }
    }

    const valorHoraDiaria = salarioBase / 30
    let valor = valorHoraDiaria * dias
    let factorCalculo = 1.0
    let detalleCalculo = `Vacaciones: ${dias} días × $${valorHoraDiaria.toFixed(0)} = $${valor.toFixed(0)}`

    console.log('✅ [VACACIONES] Cálculo completado:', {
      valor,
      factorCalculo,
      detalleCalculo
    })

    return {
      valor: Math.round(valor),
      factorCalculo,
      detalleCalculo,
      jornadaInfo: getJornadaInfo(salarioBase)
    }
  }

  return null
}

async function calculatePayroll(data: any) {
  console.log('⚙️ [CALC PAYROLL] Iniciando cálculo de nómina:', data)
  
  const { baseSalary, workedDays, extraHours, disabilities, bonuses, absences, periodType, novedades } = data

  // Validaciones básicas
  if (!baseSalary || baseSalary <= 0) {
    console.log('❌ [PAYROLL] Salario base inválido:', baseSalary)
    return null
  }

  const salarioMinimo = 1160000
  const auxilioTransporte = 140606

  let regularPay = (baseSalary / 30) * workedDays
  let extraPay = extraHours * (baseSalary / 240) // Asumiendo 240 horas mensuales

  let transportAllowance = 0
  if (baseSalary <= (salarioMinimo * 2) && regularPay > 0) {
    transportAllowance = auxilioTransporte / 30 * workedDays
  }

  let grossPay = regularPay + extraPay + transportAllowance + bonuses

  // Deducciones
  let healthDeduction = (grossPay * 0.04)
  let pensionDeduction = (grossPay * 0.04)
  let totalDeductions = healthDeduction + pensionDeduction
  let netPay = grossPay - totalDeductions

  // Contribuciones del empleador
  let employerHealth = grossPay * 0.085
  let employerPension = grossPay * 0.12
  let employerArl = grossPay * 0.00522 // Promedio ARL
  let employerCaja = grossPay * 0.04
  let employerIcbf = grossPay * 0.03
  let employerSena = grossPay * 0.02
  let employerContributions = employerHealth + employerPension + employerArl + employerCaja + employerIcbf + employerSena
  let totalPayrollCost = netPay + employerContributions

  // Cálculo del IBC (Ingreso Base de Cotización)
  let ibc = grossPay // Por defecto, el IBC es igual al salario bruto
  
  // Ajustar IBC si es necesario (e.g., aplicar topes)
  if (ibc < salarioMinimo) {
    ibc = salarioMinimo
  }

  console.log('✅ [PAYROLL] Cálculo completado:', {
    grossPay,
    healthDeduction,
    pensionDeduction,
    netPay,
    employerContributions,
    totalPayrollCost,
    ibc
  })

  return {
    regularPay,
    extraPay,
    transportAllowance,
    grossPay,
    healthDeduction,
    pensionDeduction,
    totalDeductions,
    netPay,
    employerHealth,
    employerPension,
    employerArl,
    employerCaja,
    employerIcbf,
    employerSena,
    employerContributions,
    totalPayrollCost,
    ibc // Incluir el IBC en el resultado
  }
}

async function validateEmployee(data: any) {
  console.log('✅ [VALIDATE EMPLOYEE] Validando empleado:', data)
  
  const { eps, afp, baseSalary } = data
  let errors: string[] = []
  let warnings: string[] = []
  let isValid = true

  if (!eps) {
    errors.push('EPS es requerida')
    isValid = false
  }

  if (!afp) {
    errors.push('AFP es requerida')
    isValid = false
  }

  if (baseSalary < 1160000) {
    warnings.push('Salario por debajo del mínimo')
  }

  console.log('✅ [VALIDATE EMPLOYEE] Resultado de validación:', {
    isValid,
    errors,
    warnings
  })

  return {
    isValid,
    errors,
    warnings
  }
}

function getJornadaInfo(salarioBase: number) {
  const horasSemanales = 48
  const horasMensuales = 208 // 48 * 52 / 12
  const valorHoraOrdinaria = salarioBase / horasMensuales
  
  return {
    horasSemanales,
    horasMensuales,
    divisorHorario: horasMensuales,
    valorHoraOrdinaria,
    ley: "Código Sustantivo del Trabajo - Art. 161",
    descripcion: "Jornada ordinaria 48 horas semanales"
  }
}
