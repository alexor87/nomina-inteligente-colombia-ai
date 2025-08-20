
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NovedadCalculationInput {
  tipoNovedad: string;
  subtipo?: string;
  salarioBase: number;
  horas?: number;
  dias?: number;
  fechaPeriodo?: string;
}

interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
  novedades?: any[];
  year?: string;
  // ✅ NUEVO: Política de incapacidades
  incapacityPolicy?: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
}

// ✅ CONSTANTES NORMATIVAS 2025
const CONFIGURACION_2025 = {
  salarioMinimo: 1300000,
  auxilioTransporte: 162000,
  uvt: 47065,
  smldv: 43333, // SMLDV = salario mínimo / 30 días
  porcentajes: {
    saludEmpleado: 0.04,
    pensionEmpleado: 0.04,
    saludEmpleador: 0.085,
    pensionEmpleador: 0.12,
    arl: 0.00522,
    caja: 0.04,
    icbf: 0.03,
    sena: 0.02
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    switch (action) {
      case 'calculate-novedad':
        return await handleNovedadCalculation(data);
      case 'calculate':
        return await handlePayrollCalculation(data);
      case 'batch-calculate':
        return await handleBatchCalculation(data);
      case 'validate':
        return await handleValidation(data);
      default:
        throw new Error(`Acción desconocida: ${action}`);
    }
  } catch (error) {
    console.error('❌ Error in payroll-calculations:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleNovedadCalculation(input: NovedadCalculationInput) {
  console.log('🎯 Calculando novedad:', input);

  const { tipoNovedad, subtipo, salarioBase, horas, dias, fechaPeriodo } = input;

  if (!salarioBase || salarioBase <= 0) {
    throw new Error('Salario base requerido');
  }

  const year = fechaPeriodo ? new Date(fechaPeriodo).getFullYear().toString() : '2025';
  const config = year === '2025' ? CONFIGURACION_2025 : CONFIGURACION_2025; // Fallback
  
  let valor = 0;
  let factorCalculo = 0;
  let detalleCalculo = '';

  // ✅ CÁLCULO NORMATIVO DE HORAS EXTRA
  if (tipoNovedad === 'horas_extra') {
    if (!horas || horas <= 0) {
      throw new Error('Número de horas requerido para horas extra');
    }

    const valorHoraOrdinaria = salarioBase / 240; // 240 horas mensuales según Ley 789/2002
    
    switch (subtipo) {
      case 'diurna':
        factorCalculo = 1.25; // 25% recargo
        valor = valorHoraOrdinaria * factorCalculo * horas;
        detalleCalculo = `${horas} horas × $${valorHoraOrdinaria.toLocaleString()} × 125% = $${valor.toLocaleString()}`;
        break;
      case 'nocturna':
        factorCalculo = 1.75; // 75% recargo
        valor = valorHoraOrdinaria * factorCalculo * horas;
        detalleCalculo = `${horas} horas × $${valorHoraOrdinaria.toLocaleString()} × 175% = $${valor.toLocaleString()}`;
        break;
      case 'dominical_diurna':
        factorCalculo = 2.0; // 100% recargo
        valor = valorHoraOrdinaria * factorCalculo * horas;
        detalleCalculo = `${horas} horas × $${valorHoraOrdinaria.toLocaleString()} × 200% = $${valor.toLocaleString()}`;
        break;
      case 'dominical_nocturna':
        factorCalculo = 2.5; // 150% recargo
        valor = valorHoraOrdinaria * factorCalculo * horas;
        detalleCalculo = `${horas} horas × $${valorHoraOrdinaria.toLocaleString()} × 250% = $${valor.toLocaleString()}`;
        break;
      default:
        factorCalculo = 1.25;
        valor = valorHoraOrdinaria * factorCalculo * horas;
        detalleCalculo = `${horas} horas × $${valorHoraOrdinaria.toLocaleString()} × 125% (diurna por defecto)`;
    }
  }

  // ✅ CÁLCULO NORMATIVO DE INCAPACIDADES CON PISO SMLDV
  else if (tipoNovedad === 'incapacidad') {
    if (!dias || dias <= 0) {
      throw new Error('Número de días requerido para incapacidad');
    }

    const salarioDiario = salarioBase / 30;
    const smldv = config.smldv;

    switch (subtipo) {
      case 'general':
        // ✅ POLÍTICA ESTÁNDAR CON PISO SMLDV: Días 1-2 al 100%, días 3+ al 66.67% con piso SMLDV
        if (dias <= 2) {
          valor = salarioDiario * dias;
          detalleCalculo = `${dias} días × $${salarioDiario.toLocaleString()} (100% empleador) = $${valor.toLocaleString()}`;
        } else {
          const primerosDias = salarioDiario * 2; // Días 1-2 al 100%
          const salarioDiario66 = salarioDiario * 0.6667;
          const diasRestantes = dias - 2;
          
          // ✅ APLICAR PISO SMLDV desde día 3
          const valorDiarioConPiso = Math.max(salarioDiario66, smldv);
          const diasRestantesValor = valorDiarioConPiso * diasRestantes;
          
          valor = primerosDias + diasRestantesValor;
          
          if (salarioDiario66 < smldv) {
            detalleCalculo = `2 días × $${salarioDiario.toLocaleString()} (100% empleador) + ${diasRestantes} días × $${smldv.toLocaleString()} (piso SMLDV, 66.67% EPS) = $${valor.toLocaleString()}`;
          } else {
            detalleCalculo = `2 días × $${salarioDiario.toLocaleString()} (100% empleador) + ${diasRestantes} días × $${salarioDiario66.toLocaleString()} (66.67% EPS) = $${valor.toLocaleString()}`;
          }
        }
        break;
        
      case 'laboral':
        // ARL paga 100% desde día 1
        valor = salarioDiario * dias;
        detalleCalculo = `${dias} días × $${salarioDiario.toLocaleString()} (100% ARL desde día 1) = $${valor.toLocaleString()}`;
        break;
        
      default:
        // Fallback conservador con piso SMLDV
        const salario66 = salarioDiario * 0.6667;
        const valorConPiso = Math.max(salario66, smldv);
        valor = valorConPiso * dias;
        detalleCalculo = `${dias} días × $${valorConPiso.toLocaleString()} (66.67% con piso SMLDV) = $${valor.toLocaleString()}`;
    }
  }

  // ✅ OTROS CÁLCULOS (vacaciones, licencias, etc.)
  else if (tipoNovedad === 'vacaciones' || tipoNovedad === 'licencia_remunerada') {
    if (!dias || dias <= 0) {
      throw new Error('Número de días requerido');
    }
    
    const salarioDiario = salarioBase / 30;
    valor = salarioDiario * dias;
    detalleCalculo = `${dias} días × $${salarioDiario.toLocaleString()} = $${valor.toLocaleString()}`;
  }

  else if (tipoNovedad === 'recargo_nocturno') {
    if (!horas || horas <= 0) {
      throw new Error('Número de horas requerido para recargo nocturno');
    }
    
    const valorHoraOrdinaria = salarioBase / 240;
    factorCalculo = 0.35; // 35% recargo nocturno
    valor = valorHoraOrdinaria * factorCalculo * horas;
    detalleCalculo = `${horas} horas × $${valorHoraOrdinaria.toLocaleString()} × 35% = $${valor.toLocaleString()}`;
  }

  else if (tipoNovedad === 'ausencia') {
    if (!dias || dias <= 0) {
      throw new Error('Número de días requerido para ausencia');
    }
    
    const salarioDiario = salarioBase / 30;
    valor = -(salarioDiario * dias); // Negativo porque es descuento
    detalleCalculo = `${dias} días × $${salarioDiario.toLocaleString()} (descuento) = $${valor.toLocaleString()}`;
  }

  else {
    throw new Error(`Tipo de novedad no soportado: ${tipoNovedad}`);
  }

  console.log('✅ Resultado cálculo novedad:', { valor, factorCalculo, detalleCalculo });

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        valor: Math.round(valor),
        factorCalculo,
        detalleCalculo,
        jornadaInfo: {
          horasSemanales: 48,
          horasMensuales: 240,
          divisorHorario: 240,
          valorHoraOrdinaria: salarioBase / 240,
          ley: 'Ley 789/2002',
          descripcion: 'Jornada ordinaria máxima 48 horas semanales'
        }
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handlePayrollCalculation(input: PayrollCalculationInput) {
  console.log('💰 Calculando nómina:', input);

  const year = input.year || '2025';
  const config = year === '2025' ? CONFIGURACION_2025 : CONFIGURACION_2025;

  // Cálculos básicos
  const dailySalary = input.baseSalary / 30;
  const regularPay = dailySalary * input.workedDays;
  const transportAllowance = input.baseSalary <= (2 * config.salarioMinimo) ? config.auxilioTransporte : 0;
  
  // Extra hours calculation
  const extraHourValue = input.baseSalary / 240; // 240 horas mensuales
  const extraPay = extraHourValue * 1.25 * input.extraHours; // 25% recargo básico
  
  // Gross pay
  const grossPay = regularPay + extraPay + transportAllowance + input.bonuses + input.disabilities;
  
  // IBC calculation (sin auxilio de transporte)
  const baseIbc = Math.max(regularPay + extraPay + input.bonuses + input.disabilities, config.salarioMinimo);
  const ibc = Math.min(baseIbc, config.salarioMinimo * 25); // Tope 25 SMMLV
  
  // Employee deductions
  const healthDeduction = ibc * config.porcentajes.saludEmpleado;
  const pensionDeduction = ibc * config.porcentajes.pensionEmpleado;
  const totalDeductions = healthDeduction + pensionDeduction + input.absences;
  
  // Net pay
  const netPay = grossPay - totalDeductions;
  
  // Employer contributions
  const employerHealth = ibc * config.porcentajes.saludEmpleador;
  const employerPension = ibc * config.porcentajes.pensionEmpleador;
  const employerArl = ibc * config.porcentajes.arl;
  const employerCaja = ibc * config.porcentajes.caja;
  const employerIcbf = ibc * config.porcentajes.icbf;
  const employerSena = ibc * config.porcentajes.sena;
  
  const employerContributions = employerHealth + employerPension + employerArl + employerCaja + employerIcbf + employerSena;
  const totalPayrollCost = grossPay + employerContributions;

  const result = {
    regularPay: Math.round(regularPay),
    extraPay: Math.round(extraPay),
    transportAllowance: Math.round(transportAllowance),
    grossPay: Math.round(grossPay),
    healthDeduction: Math.round(healthDeduction),
    pensionDeduction: Math.round(pensionDeduction),
    totalDeductions: Math.round(totalDeductions),
    netPay: Math.round(netPay),
    employerHealth: Math.round(employerHealth),
    employerPension: Math.round(employerPension),
    employerArl: Math.round(employerArl),
    employerCaja: Math.round(employerCaja),
    employerIcbf: Math.round(employerIcbf),
    employerSena: Math.round(employerSena),
    employerContributions: Math.round(employerContributions),
    totalPayrollCost: Math.round(totalPayrollCost),
    ibc: Math.round(ibc)
  };

  console.log('✅ Resultado cálculo nómina:', result);

  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleBatchCalculation(data: { inputs: PayrollCalculationInput[] }) {
  const results = [];
  
  for (const input of data.inputs) {
    const response = await handlePayrollCalculation(input);
    const result = await response.json();
    if (result.success) {
      results.push(result.data);
    } else {
      throw new Error(`Error en cálculo por lotes: ${result.error}`);
    }
  }

  return new Response(
    JSON.stringify({ success: true, data: results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleValidation(data: any) {
  const errors = [];
  const warnings = [];

  if (!data.baseSalary || data.baseSalary < 0) {
    errors.push('Salario base requerido y debe ser positivo');
  }

  if (data.baseSalary < CONFIGURACION_2025.salarioMinimo) {
    warnings.push(`Salario base menor al mínimo legal ($${CONFIGURACION_2025.salarioMinimo.toLocaleString()})`);
  }

  if (!data.eps && data.baseSalary > 0) {
    warnings.push('EPS no especificada');
  }

  if (!data.afp && data.baseSalary > 0) {
    warnings.push('AFP no especificada');
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
