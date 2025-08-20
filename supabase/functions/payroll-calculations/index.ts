
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log('📊 Payroll calculation request:', { action, data });

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
