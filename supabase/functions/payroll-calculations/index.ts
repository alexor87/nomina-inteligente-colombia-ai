
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

interface NovedadCalculationRequest {
  tipoNovedad: string;
  subtipo?: string;
  salarioBase: number;
  horas?: number;
  dias?: number;
  valorManual?: number;
  cuotas?: number;
  fechaPeriodo?: string;
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
    const { action, data, ...requestData } = await req.json() as PayrollCalculationRequest & NovedadCalculationRequest & { action: string, data?: any };
    
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

    if (action === 'calculate-novedad') {
      const novedadData = data || requestData;
      const result = await calculateNovedad(novedadData);
      
      return new Response(
        JSON.stringify({ success: true, data: result }),
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
    const SMLMV_2024 = 1300000; // Debería venir de configuración
    
    // Validar mínimo 10 SMLMV
    if (baseSalary < (SMLMV_2024 * 10)) {
      throw new Error(`Salario integral debe ser mínimo ${(SMLMV_2024 * 10).toLocaleString()}`);
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
  
  // Calcular IBC (base para deducciones) - PROPORCIONAL AL PERÍODO
  let ibc = (ibcBaseSalary / 30) * effectiveDays; // ✅ CORRECCIÓN: IBC proporcional al período
  
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

async function calculateNovedad(input: NovedadCalculationRequest) {
  console.log('🧮 Calculating novedad:', input);
  
  const {
    tipoNovedad,
    subtipo,
    salarioBase,
    horas = 0,
    dias = 0,
    valorManual,
    cuotas,
    fechaPeriodo
  } = input;

  if (!salarioBase || salarioBase <= 0) {
    throw new Error('Salario base requerido para el cálculo');
  }

  // Calcular información de jornada laboral colombiana
  const horasSemanales = 48;
  const horasMensuales = horasSemanales * 4.33; // Aproximadamente 208 horas/mes
  const valorHoraOrdinaria = salarioBase / horasMensuales;
  
  const jornadaInfo = {
    horasSemanales,
    horasMensuales: Math.round(horasMensuales),
    divisorHorario: horasMensuales,
    valorHoraOrdinaria,
    ley: 'Ley 50 de 1990, Art. 161 CST',
    descripcion: 'Jornada ordinaria máxima legal 48 horas semanales'
  };

  let valor = 0;
  let factorCalculo = 0;
  let detalleCalculo = '';

  // Calcular según tipo de novedad
  switch (tipoNovedad) {
    case 'horas_extra':
      if (!horas || horas <= 0) {
        throw new Error('Número de horas requerido para horas extra');
      }
      
      // Determinar factor según subtipo
      switch (subtipo) {
        case 'diurnas':
          factorCalculo = 1.25; // 25% adicional
          detalleCalculo = `${horas} horas extra diurnas × $${Math.round(valorHoraOrdinaria).toLocaleString()} × 1.25`;
          break;
        case 'nocturnas':
          factorCalculo = 1.75; // 75% adicional
          detalleCalculo = `${horas} horas extra nocturnas × $${Math.round(valorHoraOrdinaria).toLocaleString()} × 1.75`;
          break;
        case 'dominicales_diurnas':
          factorCalculo = 1.75; // 75% adicional
          detalleCalculo = `${horas} horas extra dominicales diurnas × $${Math.round(valorHoraOrdinaria).toLocaleString()} × 1.75`;
          break;
        case 'dominicales_nocturnas':
          factorCalculo = 2.0; // 100% adicional
          detalleCalculo = `${horas} horas extra dominicales nocturnas × $${Math.round(valorHoraOrdinaria).toLocaleString()} × 2.0`;
          break;
        default:
          factorCalculo = 1.25; // Por defecto diurnas
          detalleCalculo = `${horas} horas extra × $${Math.round(valorHoraOrdinaria).toLocaleString()} × 1.25`;
      }
      
      valor = valorHoraOrdinaria * horas * factorCalculo;
      break;

    case 'recargo_nocturno':
      if (!horas || horas <= 0) {
        throw new Error('Número de horas requerido para recargo nocturno');
      }
      
      factorCalculo = 0.35; // 35% adicional
      valor = valorHoraOrdinaria * horas * factorCalculo;
      detalleCalculo = `${horas} horas nocturnas × $${Math.round(valorHoraOrdinaria).toLocaleString()} × 0.35`;
      break;

    case 'vacaciones':
      if (!dias || dias <= 0) {
        throw new Error('Número de días requerido para vacaciones');
      }
      
      const valorDiario = salarioBase / 30;
      valor = valorDiario * dias;
      factorCalculo = 1.0;
      detalleCalculo = `${dias} días × $${Math.round(valorDiario).toLocaleString()} (salario diario)`;
      break;

    case 'incapacidad':
      if (!dias || dias <= 0) {
        throw new Error('Número de días requerido para incapacidad');
      }
      
      const valorDiarioIncap = salarioBase / 30;
      
      if (dias <= 2) {
        // Primeros 2 días a cargo del empleador (100%)
        valor = valorDiarioIncap * dias;
        factorCalculo = 1.0;
        detalleCalculo = `${dias} días a cargo empleador × $${Math.round(valorDiarioIncap).toLocaleString()}`;
      } else {
        // Días 3+ a cargo EPS (66.67%)
        const diasEPS = dias - 2;
        const valorEmpleador = valorDiarioIncap * 2;
        const valorEPS = valorDiarioIncap * diasEPS * 0.6667;
        valor = valorEmpleador + valorEPS;
        factorCalculo = 0.6667;
        detalleCalculo = `2 días empleador (100%) + ${diasEPS} días EPS (66.67%)`;
      }
      break;

    case 'licencia_remunerada':
      if (!dias || dias <= 0) {
        throw new Error('Número de días requerido para licencia remunerada');
      }
      
      const valorDiarioLic = salarioBase / 30;
      valor = valorDiarioLic * dias;
      factorCalculo = 1.0;
      detalleCalculo = `${dias} días × $${Math.round(valorDiarioLic).toLocaleString()} (licencia remunerada)`;
      break;

    case 'ausencia':
      if (!dias || dias <= 0) {
        throw new Error('Número de días requerido para ausencia');
      }
      
      const valorDiarioAus = salarioBase / 30;
      valor = -(valorDiarioAus * dias); // Negativo para descuento
      factorCalculo = -1.0;
      detalleCalculo = `Descuento: ${dias} días × $${Math.round(valorDiarioAus).toLocaleString()}`;
      break;

    case 'bonificacion':
    case 'comision':
    case 'prima':
    case 'otros_ingresos':
      if (valorManual !== undefined && valorManual !== null) {
        valor = Number(valorManual);
        factorCalculo = 1.0;
        detalleCalculo = `Valor manual: $${valor.toLocaleString()}`;
      } else {
        throw new Error('Valor manual requerido para este tipo de novedad');
      }
      break;

    default:
      throw new Error(`Tipo de novedad no soportado: ${tipoNovedad}`);
  }

  console.log('✅ Novedad calculated:', {
    tipoNovedad,
    subtipo,
    valor: Math.round(valor),
    factorCalculo,
    detalleCalculo
  });

  return {
    valor: Math.round(valor),
    factorCalculo,
    detalleCalculo,
    jornadaInfo
  };
}
