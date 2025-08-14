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
    
    console.log('🚀 [EDGE v7.0 - BUG FIX] Request received:', { action })

    if (action === 'calculate-novedad') {
      // ✅ LOGGING DEFENSIVO MEJORADO
      console.log('🔍 [NOVEDAD CALC] Input received:', {
        tipoNovedad: data.tipoNovedad,
        subtipo: data.subtipo,
        salarioBase: data.salarioBase,
        dias: data.dias,
        horas: data.horas,
        fechaPeriodo: data.fechaPeriodo
      })

      // ✅ DETECCIÓN ESPECÍFICA DE BUG DE INCAPACIDADES
      if (data.tipoNovedad === 'incapacidad') {
        console.log('🏥 [INCAPACIDAD DEBUG] Análisis detallado:', {
          dias_received: data.dias,
          dias_type: typeof data.dias,
          is_undefined: data.dias === undefined,
          is_null: data.dias === null,
          is_zero: data.dias === 0,
          subtipo: data.subtipo,
          salarioBase: data.salarioBase
        });

        if (data.dias === undefined || data.dias === null) {
          console.log('🚨 [INCAPACIDAD BUG] DÍAS UNDEFINED/NULL DETECTADO - posible bug en frontend')
          return new Response(
            JSON.stringify({
              success: false,
              error: 'CRITICAL BUG: Incapacidad recibida con días undefined/null. Frontend no está enviando días calculados.',
              debug: {
                receivedData: data,
                expectedDias: 'number >= 0',
                actualDias: data.dias,
                bugLocation: 'NovedadUnifiedModal.tsx - revisar conversión entry.dias || undefined'
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        if (data.dias < 0) {
          console.log('🚨 [INCAPACIDAD BUG] DÍAS NEGATIVOS DETECTADOS')
          return new Response(
            JSON.stringify({
              success: false,
              error: 'CRITICAL: Incapacidad con días negativos.',
              debug: {
                receivedData: data,
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
      
      // ✅ LOGGING DE RESULTADO MEJORADO
      console.log('📊 [NOVEDAD CALC] Resultado:', {
        tipo: data.tipoNovedad,
        subtipo: data.subtipo,
        dias_enviados: data.dias,
        valor_calculado: result?.valor || 0,
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

  console.log('🔍 [CALC NOVEDAD V2.0] ===== INICIANDO CÁLCULO =====')
  console.log('🔍 [CALC NOVEDAD V2.0] Datos completos recibidos:', JSON.stringify(data, null, 2))
  console.log('🔍 [CALC NOVEDAD V2.0] Análisis específico:', {
    tipo: tipoNovedad,
    subtipo,
    salarioBase,
    horas,
    dias,
    'typeof dias': typeof dias,
    'dias === 0': dias === 0,
    'dias === undefined': dias === undefined,
    'dias === null': dias === null,
    timestamp: new Date().toISOString()
  })

  // Validaciones básicas
  if (!salarioBase || salarioBase <= 0) {
    console.log('❌ [CALC V2.0] Salario inválido:', salarioBase)
    return null
  }

  // ✅ CORRECCIÓN ESPECÍFICA PARA INCAPACIDADES V2.0
  if (tipoNovedad === 'incapacidad') {
    console.log('🏥 [INCAPACIDAD V2.0] ===== PROCESANDO CÁLCULO =====')
    console.log('🏥 [INCAPACIDAD V2.0] Datos de entrada:', {
      subtipo: subtipo || 'general',
      dias,
      salarioBase,
      fechaPeriodo,
      timestamp: new Date().toISOString()
    })

    // ✅ VALIDACIÓN DEFENSIVA V2.0: Recalcular días si es necesario
    let diasFinales = dias;
    
    if (dias === undefined || dias === null || dias < 0) {
      console.log('⚠️ [INCAPACIDAD V2.0] Días inválidos detectados, intentando validación defensiva...')
      
      // ✅ VALIDACIÓN DEFENSIVA: Si tenemos fechas, recalcular días
      if (data.fecha_inicio && data.fecha_fin) {
        console.log('🔧 [INCAPACIDAD V2.0] Recalculando días desde fechas:', {
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin
        })
        
        try {
          const fechaInicio = new Date(data.fecha_inicio + 'T00:00:00');
          const fechaFin = new Date(data.fecha_fin + 'T00:00:00');
          const diffTime = fechaFin.getTime() - fechaInicio.getTime();
          const recalculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          if (recalculatedDays > 0) {
            diasFinales = recalculatedDays;
            console.log('✅ [INCAPACIDAD V2.0] Días recalculados exitosamente:', {
              dias_originales: dias,
              dias_recalculados: diasFinales,
              fechas: `${data.fecha_inicio} a ${data.fecha_fin}`
            });
          } else {
            console.error('❌ [INCAPACIDAD V2.0] Recálculo resultó en días <= 0:', recalculatedDays);
            return {
              valor: 0,
              factorCalculo: 0,
              detalleCalculo: `Error: Recálculo de días resultó en ${recalculatedDays}. Verificar fechas.`,
              jornadaInfo: getJornadaInfo(salarioBase)
            };
          }
        } catch (error) {
          console.error('❌ [INCAPACIDAD V2.0] Error en recálculo de días:', error);
          return {
            valor: 0,
            factorCalculo: 0,
            detalleCalculo: `Error: No se pudieron recalcular días. Días recibidos: ${dias}`,
            jornadaInfo: getJornadaInfo(salarioBase)
          };
        }
      } else {
        console.error('❌ [INCAPACIDAD V2.0] No hay fechas para recalcular días');
        return {
          valor: 0,
          factorCalculo: 0,
          detalleCalculo: `Error: Incapacidad con días inválidos (${dias}) y sin fechas para recalcular.`,
          jornadaInfo: getJornadaInfo(salarioBase)
        };
      }
    }

    console.log('🏥 [INCAPACIDAD V2.0] Días finales para cálculo:', {
      dias_originales: dias,
      dias_finales: diasFinales,
      subtipo: subtipo || 'general'
    });

    const valorHoraDiaria = salarioBase / 30
    let valor = 0
    let factorCalculo = 0
    let detalleCalculo = ''

    // Cálculo según normativa colombiana actualizada
    if (subtipo === 'laboral') {
      // ARL paga 100% desde día 1
      valor = valorHoraDiaria * diasFinales
      factorCalculo = 1.0
      detalleCalculo = `Incapacidad laboral: ${diasFinales} días × $${valorHoraDiaria.toFixed(0)} × 100% = $${valor.toFixed(0)}`
    } else {
      // EPS: empleador paga 66.67% desde día 4 (días 1-3 los paga empleador directamente)
      if (diasFinales <= 3) {
        valor = 0 // ✅ CORRECTO: Empleador paga directamente, no se registra en nómina
        factorCalculo = 0
        detalleCalculo = `Incapacidad general: ${diasFinales} días - Empleador paga directamente los primeros 3 días (Ley 100/1993)`
      } else {
        const diasEps = diasFinales - 3
        valor = valorHoraDiaria * diasEps * 0.6667
        factorCalculo = 0.6667
        detalleCalculo = `Incapacidad general: ${diasEps} días EPS (desde día 4) × $${valorHoraDiaria.toFixed(0)} × 66.67% = $${valor.toFixed(0)}`
      }
    }

    console.log('✅ [INCAPACIDAD V2.0] ===== CÁLCULO COMPLETADO =====')
    console.log('✅ [INCAPACIDAD V2.0] Resultado final:', {
      dias_procesados: diasFinales,
      valor_final: Math.round(valor),
      factorCalculo,
      es_valor_cero_correcto: valor === 0 && diasFinales <= 3 && subtipo === 'general',
      detalleCalculo,
      timestamp: new Date().toISOString()
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
