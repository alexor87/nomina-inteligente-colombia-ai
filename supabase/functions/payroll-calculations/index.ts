import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
  novedades?: Array<{
    valor: number;
    constitutivo_salario: boolean;
    tipo_novedad: string;
    subtipo?: string;
    dias?: number;
  }>;
  year?: string;
}

interface PayrollCalculationResult {
  regularPay: number;
  extraPay: number;
  transportAllowance: number;
  grossPay: number;
  healthDeduction: number;
  pensionDeduction: number;
  totalDeductions: number;
  netPay: number;
  employerHealth: number;
  employerPension: number;
  employerArl: number;
  employerCaja: number;
  employerIcbf: number;
  employerSena: number;
  employerContributions: number;
  totalPayrollCost: number;
  ibc: number;
}

// ✅ NUEVOS TIPOS: cálculo individual de novedad (usado por el hook del frontend)
interface NovedadCalculationInput {
  tipoNovedad: 'horas_extra' | 'recargo_nocturno' | 'incapacidad' | string;
  subtipo?: string;
  salarioBase: number;
  horas?: number;
  dias?: number;
  fechaPeriodo?: string; // 'YYYY-MM-DD'
}

interface NovedadCalculationResult {
  valor: number;
  factorCalculo: number;
  detalleCalculo: string;
  jornadaInfo: {
    horasSemanales: number;
    horasMensuales: number;
    divisorHorario: number;
    valorHoraOrdinaria: number;
    ley: string;
    descripcion: string;
  };
}

// ✅ NUEVA FUNCIÓN: Calcular valor de incapacidad según normativa colombiana
function calculateIncapacityValue(
  baseSalary: number,
  days: number,
  subtipo: string = 'general'
): number {
  const dailySalary = baseSalary / 30;
  
  console.log('🏥 Calculating incapacity:', {
    baseSalary,
    days,
    subtipo,
    dailySalary
  });

  switch (subtipo) {
    case 'general':
      // ✅ CORRECCIÓN NORMATIVA: Días 1-2 al 100%, día 3+ al 66.67%
      if (days <= 2) {
        const value = dailySalary * days; // 100% todos los días
        console.log('🏥 General incapacity ≤2 days at 100%:', value);
        return value;
      } else {
        // Días 1-2 al 100% + días 3+ al 66.67%
        const first2Days = dailySalary * 2; // 100%
        const remainingDays = dailySalary * (days - 2) * 0.6667; // 66.67%
        const value = first2Days + remainingDays;
        console.log('🏥 General incapacity >2 days:', {
          first2Days,
          remainingDays,
          total: value
        });
        return value;
      }
    
    case 'laboral':
      // ARL paga desde día 1 al 100%
      const value = dailySalary * days;
      console.log('🏥 Labor incapacity at 100%:', value);
      return value;
    
    default:
      console.warn('🏥 Unknown incapacity subtype:', subtipo);
      return 0;
  }
}

// Configuration for different years
const getConfiguration = (year: string = '2025') => {
  const configs = {
    '2025': {
      salarioMinimo: 1300000,
      auxilioTransporte: 162000,
      uvt: 47065
    },
    '2024': {
      salarioMinimo: 1160000,
      auxilioTransporte: 140606,
      uvt: 42412
    }
  };
  
  return configs[year as keyof typeof configs] || configs['2025'];
};

const PORCENTAJES_NOMINA = {
  SALUD_EMPLEADO: 0.04,
  SALUD_EMPLEADOR: 0.085,
  PENSION_EMPLEADO: 0.04,
  PENSION_EMPLEADOR: 0.12,
  ARL: 0.00522,
  CAJA_COMPENSACION: 0.04,
  ICBF: 0.03,
  SENA: 0.02
};

// =======================
// ✅ HELPERS JORNADA EXTRA
// =======================

// Fechas de inicio de cada fase (jornada laboral) para horas extra
const JORNADAS_LEGALES = [
  { fechaInicio: new Date('2026-07-15'), horasSemanales: 42, descripcion: 'Jornada final según Ley 2101 de 2021' },
  { fechaInicio: new Date('2025-07-15'), horasSemanales: 44, descripcion: 'Cuarta fase de reducción - Ley 2101 de 2021' },
  { fechaInicio: new Date('2024-07-15'), horasSemanales: 46, descripcion: 'Tercera fase de reducción - Ley 2101 de 2021' },
  { fechaInicio: new Date('2023-07-15'), horasSemanales: 47, descripcion: 'Segunda fase de reducción - Ley 2101 de 2021' },
  { fechaInicio: new Date('1950-01-01'), horasSemanales: 48, descripcion: 'Jornada máxima tradicional - Código Sustantivo del Trabajo' }
];

const HORAS_MENSUALES_POR_JORNADA: Record<number, number> = {
  48: 240,
  47: 235,
  46: 230,
  44: 220,
  42: 210
};

function parseFecha(fechaStr?: string): Date {
  if (!fechaStr) return new Date();
  // Espera 'YYYY-MM-DD' o ISO, nos quedamos con la parte de fecha
  try {
    const iso = fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`;
    return new Date(iso);
  } catch {
    return new Date();
  }
}

function getJornadaLegalInfo(fecha: Date) {
  const vigente = [...JORNADAS_LEGALES]
    .sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime())
    .find(j => fecha >= j.fechaInicio) || JORNADAS_LEGALES[JORNADAS_LEGALES.length - 1];

  const horasMensuales = HORAS_MENSUALES_POR_JORNADA[vigente.horasSemanales] || 240;

  return {
    horasSemanales: vigente.horasSemanales,
    horasMensuales,
    descripcion: vigente.descripcion,
    ley: 'Ley 2101 de 2021'
  };
}

// Valor base hora para HORAS EXTRA: (salario/30) / (horasSemanales/6)
function calcularValorHoraExtraBase(salarioMensual: number, fecha: Date): number {
  const jornada = getJornadaLegalInfo(fecha);
  const horasPorDia = jornada.horasSemanales / 6;
  const valorDiario = salarioMensual / 30;
  const valorHora = valorDiario / horasPorDia;
  console.log('⏱️ Valor hora extra base:', { salarioMensual, valorDiario, horasPorDia, valorHora });
  return valorHora;
}

function getFactorHorasExtra(subtipo?: string): number {
  switch (subtipo) {
    case 'diurnas': return 1.25;
    case 'nocturnas': return 1.75;
    case 'dominicales_diurnas': return 2.0;
    case 'dominicales_nocturnas': return 2.5;
    case 'festivas_diurnas': return 2.0;
    case 'festivas_nocturnas': return 2.5;
    default: return 1.0;
  }
}

// =======================
// ✅ HELPERS RECARGOS
// =======================
function getFactorRecargoBySubtype(subtipo: string | undefined, fecha: Date): { factor: number; porcentaje: string; normativa: string } {
  const s = (subtipo || '').toLowerCase();
  if (s === 'nocturno') {
    return { factor: 0.35, porcentaje: '35%', normativa: 'CST Art. 168 - Recargo nocturno ordinario' };
  }
  if (s === 'dominical') {
    if (fecha < new Date('2025-07-01')) {
      return { factor: 0.75, porcentaje: '75%', normativa: 'Ley 789/2002 Art. 3 - hasta 30-jun-2025' };
    } else if (fecha < new Date('2026-07-01')) {
      return { factor: 0.80, porcentaje: '80%', normativa: 'Ley 2466/2025 - 01-jul-2025 a 30-jun-2026' };
    } else if (fecha < new Date('2027-07-01')) {
      return { factor: 0.90, porcentaje: '90%', normativa: 'Ley 2466/2025 - 01-jul-2026 a 30-jun-2027' };
    } else {
      return { factor: 1.00, porcentaje: '100%', normativa: 'Ley 2466/2025 - desde 01-jul-2027' };
    }
  }
  if (s === 'nocturno_dominical') {
    return { factor: 1.15, porcentaje: '115%', normativa: 'CST - Recargo nocturno dominical' };
  }
  return { factor: 0, porcentaje: '0%', normativa: 'Subtipo no reconocido' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log('📊 Payroll calculation request:', { action, data });

    // ✅ NUEVO HANDLER: cálculo individual de novedad (para horas extra, recargos, incapacidad)
    if (action === 'calculate-novedad') {
      const input = data as NovedadCalculationInput;
      const fecha = parseFecha(input.fechaPeriodo);
      const salario = Number(input.salarioBase || 0);

      if (!salario || salario <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Salario base inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let result: NovedadCalculationResult | null = null;

      if (input.tipoNovedad === 'horas_extra') {
        const factor = getFactorHorasExtra(input.subtipo);
        const baseHora = calcularValorHoraExtraBase(salario, fecha);
        const horas = Number(input.horas || 0);
        const valor = Math.round(baseHora * factor * horas);

        const jornada = getJornadaLegalInfo(fecha);
        result = {
          valor,
          factorCalculo: factor,
          detalleCalculo: `Horas extra ${input.subtipo || '—'}: ((salario ÷ 30) ÷ (jornada_semanal ÷ 6)) × factor × horas = (${Math.round(salario/30)} ÷ ${(jornada.horasSemanales/6).toFixed(3)}) × ${factor} × ${horas} = ${valor.toLocaleString()}`,
          jornadaInfo: {
            horasSemanales: jornada.horasSemanales,
            horasMensuales: jornada.horasMensuales,
            divisorHorario: jornada.horasMensuales,
            valorHoraOrdinaria: Math.round(baseHora),
            ley: jornada.ley,
            descripcion: jornada.descripcion
          }
        };
      } else if (input.tipoNovedad === 'recargo_nocturno') {
        const horas = Number(input.horas || 0);
        const { factor, porcentaje, normativa } = getFactorRecargoBySubtype(input.subtipo, fecha);
        if (factor <= 0 || horas <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Datos insuficientes para recargo' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        // Fórmula usada por el servicio de recargos: salario ÷ (30 × 7.333)
        const divisor = 30 * 7.333;
        const valorHora = salario / divisor;
        const valorRecargo = Math.round(valorHora * factor * horas);

        result = {
          valor: valorRecargo,
          factorCalculo: factor,
          detalleCalculo: `Recargo ${input.subtipo || '—'}: (${salario.toLocaleString()} ÷ ${divisor.toFixed(3)}) × ${factor} × ${horas}h = ${valorRecargo.toLocaleString()} (${porcentaje}, ${normativa})`,
          jornadaInfo: {
            horasSemanales: 44,
            horasMensuales: 220,
            divisorHorario: 220,
            valorHoraOrdinaria: Math.round(valorHora),
            ley: 'CST / Ley 2466/2025',
            descripcion: 'Divisor recargos 30×7.333; jornada informativa 44h/220h'
          }
        };
      } else if (input.tipoNovedad === 'incapacidad') {
        const dias = Number(input.dias || 0);
        const subtipo = (input.subtipo || 'general').toLowerCase();
        const valor = Math.round(calculateIncapacityValue(salario, dias, subtipo));
        const jornada = getJornadaLegalInfo(fecha);

        result = {
          valor,
          factorCalculo: dias, // informativo
          detalleCalculo: `Incapacidad ${subtipo}: cálculo normativo aplicado sobre salario diario (días=${dias})`,
          jornadaInfo: {
            horasSemanales: jornada.horasSemanales,
            horasMensuales: jornada.horasMensuales,
            divisorHorario: jornada.horasMensuales,
            valorHoraOrdinaria: Math.round((salario/30) / (jornada.horasSemanales/6)),
            ley: jornada.ley,
            descripcion: jornada.descripcion
          }
        };
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Tipo de novedad no soportado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('✅ NOVEDAD RESULT:', {
        tipo: input.tipoNovedad,
        subtipo: input.subtipo,
        valor: result?.valor,
        factor: result?.factorCalculo
      });

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'calculate') {
      const input = data as PayrollCalculationInput;
      const config = getConfiguration(input.year);
      
      console.log('⚙️ Using configuration:', config);
      
      // Base daily salary
      const dailySalary = input.baseSalary / 30;

      // Acumuladores
      let bonusesConstitutivos = 0;
      let bonusesNoConstitutivos = 0;
      let extraHours = 0;
      let additionalEarnings = 0;
      let additionalDeductions = 0;

      // ✅ NUEVO: acumular días de incapacidad para descontar del salario ordinario
      let totalIncapacityDays = 0;

      // ✅ PROCESAR NOVEDADES CON NORMATIVA (mantenemos la lógica existente)
      if (input.novedades && input.novedades.length > 0) {
        console.log('📋 Processing novedades:', input.novedades.length);
        
        for (const novedad of input.novedades) {
          const valor = Number(novedad.valor) || 0;
          const esConstitutivo = Boolean(novedad.constitutivo_salario);
          
          console.log('   - Processing:', {
            tipo: novedad.tipo_novedad,
            subtipo: novedad.subtipo,
            valor,
            constitutivo: esConstitutivo,
            dias: novedad.dias
          });

          if (novedad.tipo_novedad === 'incapacidad') {
            // Sumar días de incapacidad para descontar del salario ordinario
            totalIncapacityDays += Number(novedad.dias || 0);
          }
          
          switch (novedad.tipo_novedad) {
            case 'incapacidad': {
              // ✅ Recalcular incapacidad con normativa correcta (1-2 días 100%, 3+ al 66.67%)
              if (novedad.dias && novedad.dias > 0) {
                const recalculatedValue = calculateIncapacityValue(
                  input.baseSalary,
                  novedad.dias,
                  novedad.subtipo || 'general'
                );
                console.log('🏥 Incapacity recalculated:', {
                  original: valor,
                  recalculated: recalculatedValue,
                  difference: recalculatedValue - valor
                });
                additionalEarnings += Math.round(recalculatedValue);
              } else {
                additionalEarnings += valor;
              }
              break;
            }
              
            case 'horas_extra':
            case 'recargo_nocturno':
              extraHours += valor;
              additionalEarnings += valor;
              break;
              
            case 'bonificacion':
            case 'comision':
            case 'prima':
            case 'otros_ingresos':
              if (esConstitutivo) {
                bonusesConstitutivos += valor;
              } else {
                bonusesNoConstitutivos += valor;
              }
              additionalEarnings += valor;
              break;
              
            case 'retencion_fuente':
            case 'prestamo':
            case 'embargo':
            case 'descuento_voluntario':
            case 'fondo_solidaridad':
              additionalDeductions += valor;
              break;
              
            default:
              console.log('   ⚠️ Unclassified novedad type:', novedad.tipo_novedad);
          }
        }
      }

      // ✅ NUEVO: Días efectivamente trabajados = días reportados - días de incapacidad
      const effectiveWorkedDays = Math.max(0, (input.workedDays || 0) - (totalIncapacityDays || 0));
      const transportLimit = config.salarioMinimo * 2;

      // ✅ Recalcular salario proporcional con días efectivos
      const proportionalSalary = Math.round(dailySalary * effectiveWorkedDays);
      
      // ✅ Auxilio de transporte proporcional a días efectivos
      let transportAllowance = 0;
      if (input.baseSalary <= transportLimit) {
        const dailyTransport = config.auxilioTransporte / 30;
        transportAllowance = Math.round(dailyTransport * effectiveWorkedDays);
      }
      
      // Calculate IBC (includes constitutive bonuses and extra hours)
      const salarioBaseParaAportes = proportionalSalary + bonusesConstitutivos + extraHours;
      
      // ✅ Mínimo IBC proporcional a días efectivos cuando base < SMMLV
      let ibcSalud, ibcPension;
      if (input.baseSalary >= config.salarioMinimo) {
        ibcSalud = salarioBaseParaAportes;
        ibcPension = salarioBaseParaAportes;
      } else {
        const minIbc = (config.salarioMinimo / 30) * effectiveWorkedDays;
        ibcSalud = Math.max(salarioBaseParaAportes, minIbc);
        ibcPension = Math.max(salarioBaseParaAportes, minIbc);
      }
      
      // Total earnings
      const grossPay = proportionalSalary + transportAllowance + additionalEarnings;
      
      // Deductions
      const healthDeduction = Math.round(ibcSalud * PORCENTAJES_NOMINA.SALUD_EMPLEADO);
      const pensionDeduction = Math.round(ibcPension * PORCENTAJES_NOMINA.PENSION_EMPLEADO);
      const totalDeductions = healthDeduction + pensionDeduction + additionalDeductions;
      
      // Net pay
      const netPay = grossPay - totalDeductions;
      
      // Employer contributions
      const employerHealth = Math.round(ibcSalud * PORCENTAJES_NOMINA.SALUD_EMPLEADOR);
      const employerPension = Math.round(ibcPension * PORCENTAJES_NOMINA.PENSION_EMPLEADOR);
      const employerArl = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.ARL);
      const employerCaja = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.CAJA_COMPENSACION);
      const employerIcbf = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.ICBF);
      const employerSena = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.SENA);
      
      const employerContributions = employerHealth + employerPension + employerArl + employerCaja + employerIcbf + employerSena;
      const totalPayrollCost = netPay + employerContributions;
      
      const result: PayrollCalculationResult = {
        regularPay: proportionalSalary,
        extraPay: extraHours,
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
        ibc: ibcSalud
      };
      
      console.log('✅ Calculation result (with incapacity days deducted):', {
        totalIncapacityDays,
        effectiveWorkedDays,
        proportionalSalary,
        transportAllowance,
        grossPay,
        healthDeduction,
        pensionDeduction
      });
      
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'validate') {
      // Basic validation logic
      const validation = {
        isValid: true,
        errors: [],
        warnings: []
      };
      
      return new Response(
        JSON.stringify({ success: true, data: validation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Payroll calculation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
