
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
  periodType: 'quincenal' | 'mensual';
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

function validateEmployee(input: PayrollCalculationInput, eps?: string, afp?: string) {
  const config = DEFAULT_CONFIG_2025;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!eps) errors.push('Falta afiliación a EPS');
  if (!afp) errors.push('Falta afiliación a AFP');

  let maxDays: number;
  switch (input.periodType) {
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

  if (input.extraHours > 60) {
    warnings.push('Horas extra excesivas (más de 60 horas)');
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
    warnings
  };
}

function calculatePayroll(input: PayrollCalculationInput) {
  const config = DEFAULT_CONFIG_2025;
  
  let periodDays: number;
  let monthlyDivisor: number;
  let hourlyDivisor: number;
  
  switch (input.periodType) {
    case 'quincenal':
      periodDays = 15;
      monthlyDivisor = 30;
      hourlyDivisor = 240;
      break;
    case 'mensual':
      periodDays = 30;
      monthlyDivisor = 30;
      hourlyDivisor = 240;
      break;
    default:
      periodDays = 30;
      monthlyDivisor = 30;
      hourlyDivisor = 240;
  }
  
  const dailySalary = input.baseSalary / monthlyDivisor;
  const effectiveWorkedDays = Math.max(0, input.workedDays - input.disabilities - input.absences);
  const regularPay = effectiveWorkedDays * dailySalary;

  const hourlyRate = input.baseSalary / hourlyDivisor;
  const extraPay = input.extraHours * hourlyRate * 1.25;

  let transportAllowance = 0;
  if (input.baseSalary <= (config.salarioMinimo * 2)) {
    if (input.periodType === 'quincenal') {
      transportAllowance = Math.round((config.auxilioTransporte / 2) * (input.workedDays / periodDays));
    } else {
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
    totalPayrollCost: Math.round(totalPayrollCost)
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
