import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  periodDate?: string; // Nueva propiedad para jornada legal dinámica
}

interface PayrollConfiguration {
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  porcentajes: {
    saludEmpleado: number;
    pensionEmpleado: number;
    saludEmpleador: number;
    pensionEmpleador: number;
    arl: number;
    cajaCompensacion: number;
    icbf: number;
    sena: number;
    cesantias: number;
    interesesCesantias: number;
    prima: number;
    vacaciones: number;
  };
}

interface JornadaLegalInfo {
  horasSemanales: number;
  horasMensuales: number;
  fechaVigencia: Date;
  descripcion: string;
  ley: string;
}

const DEFAULT_CONFIG_2025: PayrollConfiguration = {
  salarioMinimo: 1300000,
  auxilioTransporte: 200000,
  uvt: 47065,
  porcentajes: {
    saludEmpleado: 0.04,
    pensionEmpleado: 0.04,
    saludEmpleador: 0.085,
    pensionEmpleador: 0.12,
    arl: 0.00522,
    cajaCompensacion: 0.04,
    icbf: 0.03,
    sena: 0.02,
    cesantias: 0.0833,
    interesesCesantias: 0.12,
    prima: 0.0833,
    vacaciones: 0.0417,
  }
};

// Jornadas legales según Ley 2101 de 2021
const JORNADAS_LEGALES = [
  {
    fechaInicio: new Date('2026-07-15'),
    horasSemanales: 42,
    descripcion: 'Jornada final según Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('2025-07-15'),
    horasSemanales: 44,
    descripcion: 'Cuarta fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('2024-07-15'),
    horasSemanales: 46,
    descripcion: 'Tercera fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('2023-07-15'),
    horasSemanales: 47,
    descripcion: 'Segunda fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('1950-01-01'),
    horasSemanales: 48,
    descripcion: 'Jornada máxima tradicional - Código Sustantivo del Trabajo'
  }
];

function getJornadaLegal(fecha: Date = new Date()): JornadaLegalInfo {
  const jornadaVigente = JORNADAS_LEGALES
    .sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime())
    .find(jornada => fecha >= jornada.fechaInicio);

  if (!jornadaVigente) {
    const jornadaTradicional = JORNADAS_LEGALES[JORNADAS_LEGALES.length - 1];
    return {
      horasSemanales: jornadaTradicional.horasSemanales,
      horasMensuales: (jornadaTradicional.horasSemanales * 52) / 12,
      fechaVigencia: jornadaTradicional.fechaInicio,
      descripcion: jornadaTradicional.descripcion,
      ley: 'Código Sustantivo del Trabajo'
    };
  }

  return {
    horasSemanales: jornadaVigente.horasSemanales,
    horasMensuales: (jornadaVigente.horasSemanales * 52) / 12,
    fechaVigencia: jornadaVigente.fechaInicio,
    descripcion: jornadaVigente.descripcion,
    ley: 'Ley 2101 de 2021'
  };
}

function getHourlyDivisor(fecha: Date = new Date()): number {
  const jornadaInfo = getJornadaLegal(fecha);
  return Math.round(jornadaInfo.horasMensuales);
}

function validateEmployee(input: PayrollCalculationInput, eps?: string, afp?: string) {
  const config = DEFAULT_CONFIG_2025;
  const periodDate = input.periodDate ? new Date(input.periodDate) : new Date();
  const jornadaLegal = getJornadaLegal(periodDate);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!eps) errors.push('Falta afiliación a EPS');
  if (!afp) errors.push('Falta afiliación a AFP');

  let maxDays: number;
  switch (input.periodType) {
    case 'semanal':
      maxDays = 7;
      break;
    case 'quincenal':
      maxDays = 15;
      break;
    case 'mensual':
      maxDays = 30;
      break;
    default:
      maxDays = 30;
  }

  if (input.workedDays > maxDays) {
    errors.push(`Días trabajados (${input.workedDays}) exceden el período ${input.periodType} (máximo ${maxDays})`);
  }
  if (input.workedDays < 0) {
    errors.push('Los días trabajados no pueden ser negativos');
  }

  // Validación mejorada de horas extra con jornada legal dinámica
  const maxHorasExtraSemanales = jornadaLegal.horasSemanales * 0.25;
  let horasExtraSemanalesEstimadas: number;
  
  switch (input.periodType) {
    case 'semanal':
      horasExtraSemanalesEstimadas = input.extraHours;
      break;
    case 'quincenal':
      horasExtraSemanalesEstimadas = input.extraHours / 2;
      break;
    case 'mensual':
      horasExtraSemanalesEstimadas = input.extraHours / 4;
      break;
    default:
      horasExtraSemanalesEstimadas = input.extraHours / 4;
  }
  
  if (horasExtraSemanalesEstimadas > maxHorasExtraSemanales) {
    warnings.push(`Horas extra excesivas para jornada de ${jornadaLegal.horasSemanales}h semanales (máximo recomendado: ${maxHorasExtraSemanales}h/semana)`);
  }
  if (input.extraHours < 0) {
    errors.push('Las horas extra no pueden ser negativas');
  }

  if (input.disabilities > input.workedDays) {
    errors.push('Los días de incapacidad no pueden ser mayores a los días trabajados');
  }
  if (input.disabilities < 0) {
    errors.push('Los días de incapacidad no pueden ser negativos');
  }

  if (input.baseSalary < config.salarioMinimo) {
    errors.push(`El salario base es menor al SMMLV`);
  }

  if (input.baseSalary >= config.salarioMinimo * 10) {
    warnings.push('Salario alto - verificar cálculo de aportes');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    jornadaInfo: {
      horasSemanales: jornadaLegal.horasSemanales,
      ley: jornadaLegal.ley,
      descripcion: jornadaLegal.descripcion
    }
  };
}

function calculatePayroll(input: PayrollCalculationInput) {
  const config = DEFAULT_CONFIG_2025;
  const periodDate = input.periodDate ? new Date(input.periodDate) : new Date();
  const jornadaLegal = getJornadaLegal(periodDate);
  const hourlyDivisor = getHourlyDivisor(periodDate);
  
  // CORRECCIÓN CRÍTICA: Calcular divisores correctos según período
  let periodDays: number;
  let monthlyDivisor: number;
  
  switch (input.periodType) {
    case 'semanal':
      periodDays = 7;
      monthlyDivisor = 120; // 30 días × 4 semanas por mes
      break;
    case 'quincenal':
      periodDays = 15;
      monthlyDivisor = 30; // Divisor como Aleluya para 15 días
      break;
    case 'mensual':
      periodDays = 30;
      monthlyDivisor = 30;
      break;
    default:
      periodDays = 30;
      monthlyDivisor = 30;
  }
  
  const dailySalary = input.baseSalary / monthlyDivisor;
  const effectiveWorkedDays = Math.max(0, input.workedDays - input.disabilities - input.absences);
  const regularPay = effectiveWorkedDays * dailySalary;

  // Usar divisor horario dinámico basado en jornada legal
  const hourlyRate = input.baseSalary / hourlyDivisor;
  const extraPay = input.extraHours * hourlyRate * 1.25;

  // CORRECCIÓN: Auxilio de transporte proporcional por período
  let transportAllowance = 0;
  if (input.baseSalary <= (config.salarioMinimo * 2)) {
    switch (input.periodType) {
      case 'semanal':
        transportAllowance = Math.round((config.auxilioTransporte / 4) * (input.workedDays / periodDays));
        break;
      case 'quincenal':
        transportAllowance = Math.round((config.auxilioTransporte / 2) * (input.workedDays / periodDays));
        break;
      case 'mensual':
        transportAllowance = Math.round(config.auxilioTransporte * (input.workedDays / periodDays));
        break;
      default:
        transportAllowance = Math.round(config.auxilioTransporte * (input.workedDays / periodDays));
    }
  }

  const payrollBase = regularPay + extraPay + input.bonuses;

  const healthDeduction = payrollBase * config.porcentajes.saludEmpleado;
  const pensionDeduction = payrollBase * config.porcentajes.pensionEmpleado;
  const totalDeductions = healthDeduction + pensionDeduction;

  const grossPay = payrollBase + transportAllowance;
  const netPay = grossPay - totalDeductions;

  const employerHealth = payrollBase * config.porcentajes.saludEmpleador;
  const employerPension = payrollBase * config.porcentajes.pensionEmpleador;
  const employerArl = payrollBase * config.porcentajes.arl;
  const employerCaja = payrollBase * config.porcentajes.cajaCompensacion;
  const employerIcbf = payrollBase * config.porcentajes.icbf;
  const employerSena = payrollBase * config.porcentajes.sena;

  const employerContributions = employerHealth + employerPension + employerArl + 
                                employerCaja + employerIcbf + employerSena;

  const totalPayrollCost = netPay + employerContributions;

  return {
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
    // Información adicional sobre jornada legal
    jornadaInfo: {
      horasSemanales: jornadaLegal.horasSemanales,
      horasMensuales: Math.round(jornadaLegal.horasMensuales),
      divisorHorario: hourlyDivisor,
      valorHoraOrdinaria: Math.round(input.baseSalary / hourlyDivisor),
      ley: jornadaLegal.ley,
      descripcion: jornadaLegal.descripcion
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    switch (action) {
      case 'calculate':
        const calculation = calculatePayroll(data);
        return new Response(JSON.stringify({ success: true, data: calculation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'validate':
        const validation = validateEmployee(data, data.eps, data.afp);
        return new Response(JSON.stringify({ success: true, data: validation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'batch-calculate':
        const batchResults = data.inputs.map((input: PayrollCalculationInput) => calculatePayroll(input));
        return new Response(JSON.stringify({ success: true, data: batchResults }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get-jornada-legal':
        const fecha = data.fecha ? new Date(data.fecha) : new Date();
        const jornadaInfo = getJornadaLegal(fecha);
        return new Response(JSON.stringify({ 
          success: true, 
          data: {
            ...jornadaInfo,
            divisorHorario: getHourlyDivisor(fecha)
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in payroll-calculations function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
