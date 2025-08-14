
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayrollCalculationRequest {
  baseSalary: number;
  tipoSalario?: 'mensual' | 'integral' | 'medio_tiempo';
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
  novedades?: any[];
}

interface SalaryBreakdown {
  factorSalarial?: number;
  factorPrestacional?: number;
  proportionalSalary?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...requestData } = await req.json() as PayrollCalculationRequest & { action: string };
    
    console.log('🔍 Payroll calculation request:', { action, tipoSalario: requestData.tipoSalario });

    if (action === 'calculate') {
      const result = await calculatePayroll(requestData);
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Acción no válida' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('❌ Error in payroll calculation:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function calculatePayroll(input: PayrollCalculationRequest) {
  console.log('🧮 Calculating payroll with salary type:', input.tipoSalario);
  
  const {
    baseSalary,
    tipoSalario = 'mensual',
    workedDays,
    extraHours,
    disabilities,
    bonuses,
    absences,
    periodType,
    novedades = []
  } = input;

  // ✅ NUEVO: Lógica específica por tipo de salario
  let salaryBreakdown: SalaryBreakdown = {};
  let effectiveBaseSalary = baseSalary;
  let ibcBaseSalary = baseSalary;

  // 🔥 SALARIO INTEGRAL: Aplicar factor 70% para IBC
  if (tipoSalario === 'integral') {
    const SALARIO_MINIMO_2025 = 1423500; // Salario mínimo 2025
    
    // Validar mínimo 13 SMLMV (legal colombiano)
    if (baseSalary < (SALARIO_MINIMO_2025 * 13)) {
      throw new Error(`Salario integral debe ser mínimo 13 SMMLV (${(SALARIO_MINIMO_2025 * 13).toLocaleString()})`);
    }
    
    // Calcular factores
    salaryBreakdown.factorSalarial = Math.round(baseSalary * 0.7);
    salaryBreakdown.factorPrestacional = Math.round(baseSalary * 0.3);
    
    // Para efectos de IBC, solo se usa el 70%
    ibcBaseSalary = salaryBreakdown.factorSalarial;
    effectiveBaseSalary = baseSalary; // El salario completo para pagos
    
    console.log('💰 Salario Integral:', {
      total: baseSalary,
      factorSalarial: salaryBreakdown.factorSalarial,
      factorPrestacional: salaryBreakdown.factorPrestacional,
      ibcBaseSalary
    });
  }
  
  // 🔥 MEDIO TIEMPO: Calcular proporcional
  else if (tipoSalario === 'medio_tiempo') {
    // Asumir jornada completa = 48 horas/sem, medio tiempo = 24 horas/sem
    const proportionFactor = 0.5; // Esto debería calcularse dinámicamente
    salaryBreakdown.proportionalSalary = Math.round(baseSalary * proportionFactor);
    effectiveBaseSalary = salaryBreakdown.proportionalSalary;
    ibcBaseSalary = salaryBreakdown.proportionalSalary;
    
    console.log('⏰ Medio Tiempo:', {
      salarioCompleto: baseSalary,
      proportionalSalary: salaryBreakdown.proportionalSalary,
      factor: proportionFactor
    });
  }

  // Calcular días trabajados según período
  const daysInPeriod = periodType === 'quincenal' ? 15 : 30;
  const effectiveDays = Math.min(workedDays, daysInPeriod);
  
  // Calcular salario base proporcional a días trabajados
  const proportionalSalary = (effectiveBaseSalary / 30) * effectiveDays;
  
  // Auxilio de transporte (solo para salarios <= 2 SMLMV)
  const SMLMV_2024 = 1300000;
  const transportAllowance = (effectiveBaseSalary <= SMLMV_2024 * 2) ? 162000 : 0;
  
  // Calcular IBC (base para deducciones)
  let ibc = ibcBaseSalary;
  
  // Agregar novedades constitutivas al IBC
  const constitutiveNovedades = novedades
    .filter(nov => nov.constitutivo_salario && nov.valor > 0)
    .reduce((sum, nov) => sum + Number(nov.valor), 0);
  
  if (constitutiveNovedades > 0) {
    ibc += constitutiveNovedades;
    console.log('📈 Novedades constitutivas agregadas al IBC:', constitutiveNovedades);
  }
  
  // Calcular deducciones sobre el IBC
  const healthDeduction = Math.round(ibc * 0.04); // 4% salud empleado
  const pensionDeduction = Math.round(ibc * 0.04); // 4% pensión empleado
  
  // ✅ SALARIO INTEGRAL: No calcular prestaciones sociales adicionales
  let additionalDeductions = 0;
  if (tipoSalario !== 'integral') {
    // Para salario tradicional, agregar otras deducciones si aplican
    additionalDeductions = 0; // Aquí irían otras deducciones
  }
  
  const totalDeductions = healthDeduction + pensionDeduction + additionalDeductions + absences;
  
  // Calcular aportes patronales
  const employerHealth = Math.round(ibc * 0.085); // 8.5% salud empleador
  const employerPension = Math.round(ibc * 0.12); // 12% pensión empleador
  const employerARL = Math.round(ibc * 0.00522); // 0.522% ARL promedio
  const employerSENA = Math.round(ibc * 0.02); // 2% SENA
  const employerICBF = Math.round(ibc * 0.03); // 3% ICBF
  const employerCajas = Math.round(ibc * 0.04); // 4% Cajas de compensación
  
  const totalEmployerContributions = employerHealth + employerPension + 
    employerARL + employerSENA + employerICBF + employerCajas;
  
  // Calcular devengado total
  const grossPay = proportionalSalary + transportAllowance + bonuses + disabilities;
  const netPay = grossPay - totalDeductions;
  
  console.log('📊 Cálculo completado:', {
    tipoSalario,
    baseSalary,
    effectiveBaseSalary,
    ibc,
    grossPay,
    totalDeductions,
    netPay,
    salaryBreakdown
  });

  return {
    grossPay: Math.round(grossPay),
    totalDeductions: Math.round(totalDeductions),
    netPay: Math.round(netPay),
    transportAllowance: Math.round(transportAllowance),
    employerContributions: Math.round(totalEmployerContributions),
    ibc: Math.round(ibc),
    healthDeduction: Math.round(healthDeduction),
    pensionDeduction: Math.round(pensionDeduction),
    salaryBreakdown
  };
}
