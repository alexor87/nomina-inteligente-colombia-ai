import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ VALORES OFICIALES CORREGIDOS 2025/2024
const OFFICIAL_VALUES = {
  '2025': {
    salarioMinimo: 1423500,  // ✅ CORREGIDO: Valor oficial 2025
    auxilioTransporte: 200000, // ✅ CORREGIDO: Valor oficial 2025
    uvt: 49799 // ✅ CORREGIDO: Valor oficial 2025
  },
  '2024': {
    salarioMinimo: 1300000,
    auxilioTransporte: 162000,
    uvt: 47065
  }
};

// ✅ LÍMITE CORRECTO AUXILIO TRANSPORTE 2025: 2 SMMLV
const getTransportAssistanceLimit = (year: string) => {
  const values = OFFICIAL_VALUES[year as keyof typeof OFFICIAL_VALUES] || OFFICIAL_VALUES['2025'];
  return values.salarioMinimo * 2; // 2 SMMLV
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()
    console.log('📊 Payroll calculation request:', { action, data })

    if (action === 'calculate') {
      const result = await calculatePayroll(supabase, data)
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (action === 'validate') {
      const result = await validateEmployee(data)
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (action === 'batch-calculate') {
      const results = await Promise.all(data.inputs.map((input: any) => calculatePayroll(supabase, input)))
      return new Response(JSON.stringify({ success: true, data: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (action === 'calculate-novedades-totals') {
      const result = await calculateNovedadesTotals(supabase, data)
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (action === 'calculate-novedad') {
      // ✅ NUEVO: cálculo unitario de una novedad (incapacidad, horas extra, etc.)
      const result = await calculateSingleNovedad(supabase, data)
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      throw new Error(`Acción no válida: ${action}`)
    }
  } catch (error) {
    console.error('Error in payroll calculation:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

async function getCompanyPolicy(supabase: any): Promise<{ incapacity_policy: string }> {
  try {
    // Try company_settings first
    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('incapacity_policy')
      .single();

    if (!settingsError && settings && settings.incapacity_policy) {
      return { incapacity_policy: settings.incapacity_policy };
    }

    console.log('ℹ️ company_settings not available or columns missing, trying company_payroll_policies:', settingsError?.message);

    // Fallback to company_payroll_policies
    const { data: policies, error: policiesError } = await supabase
      .from('company_payroll_policies')
      .select('incapacity_policy')
      .single();

    if (!policiesError && policies && policies.incapacity_policy) {
      return { incapacity_policy: policies.incapacity_policy };
    }

    console.log('ℹ️ No company policies found, using default');
    return { incapacity_policy: 'standard_2d_100_rest_66' };
  } catch (error) {
    console.log('ℹ️ Error loading company policies, using default:', error.message);
    return { incapacity_policy: 'standard_2d_100_rest_66' };
  }
}

async function calculatePayroll(supabase: any, data: any) {
  const year = data.year || '2025';
  const config = OFFICIAL_VALUES[year as keyof typeof OFFICIAL_VALUES] || OFFICIAL_VALUES['2025'];
  const policy = await getCompanyPolicy(supabase);
  
  console.log('⚙️ Using configuration:', config, 'Policy:', policy);

  const {
    baseSalary,
    workedDays,
    extraHours = 0,
    disabilities = 0,
    bonuses = 0,
    absences = 0,
    periodType,
    novedades = []
  } = data;

  const dailySalary = baseSalary / 30;
  const regularPay = (dailySalary * workedDays) - absences;
  let extraPay = bonuses; // Legacy field compatibility

  // ✅ PROCESAR NOVEDADES CON POLÍTICAS
  console.log('📋 Processing novedades:', novedades.length);
  
  let totalIncapacityValue = 0;
  let totalIncapacityDays = 0;
  let totalConstitutiveNovedades = 0;

  for (const novedad of novedades) {
    if (novedad.tipo_novedad === 'incapacidad') {
      const incapacityValue = await calculateIncapacityWithPolicy(
        baseSalary, 
        novedad.dias || 0, 
        novedad.subtipo, 
        policy,
        config.salarioMinimo
      );
      totalIncapacityValue += incapacityValue;
      totalIncapacityDays += novedad.dias || 0;
    } else if (novedad.constitutivo_salario) {
      // Other constitutive novedades
      totalConstitutiveNovedades += novedad.valor || 0;
    }
    
    // Add to extraPay for gross calculation
    extraPay += novedad.valor || 0;
  }

  const grossPay = regularPay + extraPay;

  // ✅ IBC AUTOMÁTICO: Incapacidad vs Proporcional
  let ibcSalud: number;
  let ibcMode: string;

  if (totalIncapacityDays > 0) {
    // Con incapacidades: IBC = valor total de incapacidades
    ibcSalud = totalIncapacityValue;
    ibcMode = 'incapacity';
    console.log('🧮 IBC automático (incapacidad):', { totalIncapacityValue, totalIncapacityDays });
  } else {
    // Sin incapacidades: IBC proporcional
    const effectiveWorkedDays = Math.min(workedDays, 30);
    ibcSalud = Math.round((baseSalary / 30) * effectiveWorkedDays + totalConstitutiveNovedades);
    ibcMode = 'proportional';
    console.log('🧮 IBC automático (proporcional):', { ibcSalud, effectiveWorkedDays });
  }

  const healthDeduction = Math.round(ibcSalud * 0.04);
  const pensionDeduction = Math.round(ibcSalud * 0.04);
  const totalDeductions = healthDeduction + pensionDeduction;

  // ✅ AUXILIO DE TRANSPORTE CORREGIDO: Solo si salario ≤ 2 SMMLV
  const transportLimit = getTransportAssistanceLimit(year);
  const transportAllowance = baseSalary <= transportLimit ? config.auxilioTransporte : 0;

  const netPay = grossPay - totalDeductions + transportAllowance;

  // Employer contributions (not affected by IBC mode)
  const employerHealth = Math.round(ibcSalud * 0.085);
  const employerPension = Math.round(ibcSalud * 0.12);
  const employerArl = Math.round(ibcSalud * 0.00522);
  const employerCaja = Math.round(ibcSalud * 0.04);
  const employerIcbf = Math.round(ibcSalud * 0.03);
  const employerSena = Math.round(ibcSalud * 0.02);

  const employerContributions = employerHealth + employerPension + employerArl + 
                               employerCaja + employerIcbf + employerSena;

  const result = {
    regularPay: Math.round(regularPay),
    extraPay: Math.round(extraPay),
    transportAllowance,
    grossPay: Math.round(grossPay),
    healthDeduction,
    pensionDeduction,
    totalDeductions,
    netPay: Math.round(netPay),
    employerHealth,
    employerPension,
    employerArl,
    employerCaja,
    employerIcbf,
    employerSena,
    employerContributions,
    totalPayrollCost: Math.round(netPay + employerContributions),
    // ✅ IBC UNIFICADO
    ibc: ibcSalud
  };

  console.log('✅ Calculation (automatic IBC) result:', {
    policy,
    totalIncapacityDays,
    totalIncapacityValue,
    ibcMode,
    ibcSalud,
    healthDeduction,
    pensionDeduction
  });

  return result;
}

async function calculateIncapacityWithPolicy(
  baseSalary: number, 
  days: number, 
  subtipo: string, 
  policy: any,
  smlv: number
): Promise<number> {
  if (!days || days <= 0) return 0;

  const dailySalary = baseSalary / 30;
  const normalizedSubtype = normalizeIncapacitySubtype(subtipo);
  
  console.log('🏥 Incapacity with policy:', {
    baseSalary,
    days,
    subtipo,
    normalized: normalizedSubtype,
    policy,
    dailySalary,
    smlv
  });

  if (normalizedSubtype === 'laboral') {
    // ARL: 100% desde día 1
    return Math.round(dailySalary * days);
  }

  // Incapacidad general: aplicar política
  if (policy.incapacity_policy === 'from_day1_66_with_floor') {
    // Todos los días al 66.67% con piso SMLDV
    const daily66 = dailySalary * 0.6667;
    const smldv = smlv / 30; // SMLDV = SMLV / 30
    const appliedDaily = Math.max(daily66, smldv);
    const total = Math.round(appliedDaily * days);
    
    console.log('🏥 General with floor (from day 1): daily66, smldv, applied, total', daily66, smldv, appliedDaily, total);
    return total;
  } else {
    // Política estándar: 2 días 100%, resto 66.67% con piso
    if (days <= 2) {
      return Math.round(dailySalary * days);
    } else {
      const first2Days = dailySalary * 2;
      const remainingDays = days - 2;
      const daily66 = dailySalary * 0.6667;
      const smldv = smlv / 30;
      const appliedDaily = Math.max(daily66, smldv);
      const total = Math.round(first2Days + (appliedDaily * remainingDays));
      
      console.log('🏥 Standard policy (2+rest): first2, remaining, daily66, smldv, applied, total', 
        first2Days, remainingDays, daily66, smldv, appliedDaily, total);
      return total;
    }
  }
}

function normalizeIncapacitySubtype(subtipo?: string): 'general' | 'laboral' {
  if (!subtipo) return 'general';
  const s = subtipo.toLowerCase().trim();

  if (['comun', 'común', 'enfermedad_general', 'eg', 'general'].includes(s)) {
    return 'general';
  }
  if (['laboral', 'arl', 'accidente_laboral', 'riesgo_laboral', 'at'].includes(s)) {
    return 'laboral';
  }
  return 'general';
}

async function calculateNovedadesTotals(supabase: any, data: any) {
  const { salarioBase, fechaPeriodo, novedades = [] } = data;
  const policy = await getCompanyPolicy(supabase);
  const year = new Date(fechaPeriodo).getFullYear().toString();
  const config = OFFICIAL_VALUES[year as keyof typeof OFFICIAL_VALUES] || OFFICIAL_VALUES['2025'];

  console.log('📊 BACKEND: Calculando totales de novedades con política:', {
    salarioBase,
    fechaPeriodo,
    novedadesCount: novedades.length,
    policy
  });

  let totalDevengos = 0;
  let totalDeducciones = 0;

  // ✅ Calcular valor de hora base
  const valorDiario = salarioBase / 30;
  const horasPorDia = 8 * (23/30); // 7.67 horas efectivas
  const valorHora = valorDiario / horasPorDia;

  console.log('⏱️ Valor hora extra base:', {
    salarioMensual: salarioBase,
    valorDiario,
    horasPorDia,
    valorHora
  });

  for (const novedad of novedades) {
    const { tipo_novedad, subtipo, valor: valorOriginal, dias, horas } = novedad;

    let valorCalculado = valorOriginal || 0;

    if (tipo_novedad === 'incapacidad') {
      // ✅ Recalcular incapacidades con política de empresa
      valorCalculado = await calculateIncapacityWithPolicy(
        salarioBase, 
        dias || 0, 
        subtipo, 
        policy,
        config.salarioMinimo
      );

      console.log('🏥 Totals incapacidad calculada:', {
        valorOriginal,
        valorCalculado,
        detalleCalculo: `Incapacidad ${normalizeIncapacitySubtype(subtipo)} (política ${policy.incapacity_policy === 'from_day1_66_with_floor' ? 'día 1 con piso' : 'estándar'}): ${dias} días × ${policy.incapacity_policy === 'from_day1_66_with_floor' ? 'máx(66.67% diario, SMLDV=' + Math.round(config.salarioMinimo/30) + ')' : '2d 100% + resto 66.67%'} = ${valorCalculado.toLocaleString()}`
      });
    } else if (tipo_novedad === 'horas_extra') {
      // Calcular horas extra según subtipo
      const horasNum = Number(horas || 0);
      if (horasNum > 0) {
        let recargo = 0.25; // Diurnas por defecto
        
        if (subtipo === 'nocturnas') recargo = 0.75;
        else if (subtipo === 'dominicales') recargo = 0.75;
        else if (subtipo === 'festivas') recargo = 0.75;
        
        valorCalculado = Math.round(valorHora * horasNum * (1 + recargo));
      }
    }

    // Clasificar como devengo o deducción
    if (['incapacidad', 'horas_extra', 'bonificacion', 'comision', 'prima', 'recargo_nocturno'].includes(tipo_novedad)) {
      totalDevengos += valorCalculado;
    } else if (['descuento', 'prestamo', 'multa'].includes(tipo_novedad)) {
      totalDeducciones += valorCalculado;
    } else {
      // Por defecto, considerar como devengo
      totalDevengos += valorCalculado;
    }
  }

  const totalNeto = totalDevengos - totalDeducciones;

  const result = {
    totalDevengos: Math.round(totalDevengos),
    totalDeducciones: Math.round(totalDeducciones),
    totalNeto: Math.round(totalNeto),
    itemsProcessed: novedades.length
  };

  console.log('✅ BACKEND: Totales (policy-aware):', result);
  return result;
}

async function calculateSingleNovedad(supabase: any, data: any) {
  const {
    tipoNovedad,
    subtipo,
    salarioBase,
    horas,
    dias,
    fechaPeriodo
  } = data;

  const year = fechaPeriodo ? new Date(fechaPeriodo).getFullYear().toString() : '2025';
  const config = OFFICIAL_VALUES[year as keyof typeof OFFICIAL_VALUES] || OFFICIAL_VALUES['2025'];
  const policy = await getCompanyPolicy(supabase);

  console.log('🧩 calculateSingleNovedad:', {
    tipoNovedad, subtipo, salarioBase, horas, dias, fechaPeriodo, year, policy
  });

  // Valores base para jornada
  const valorDiario = salarioBase / 30;
  const horasPorDia = 8 * (23/30); // 6.1333 h/día efectivos (consistente con totals)
  const horasSemanales = 48;
  const horasMensuales = Math.round(horasSemanales * 4);
  const valorHora = valorDiario / horasPorDia;

  let valor = 0;
  let factorCalculo = 0;
  let detalleCalculo = '';

  if (tipoNovedad === 'incapacidad') {
    const diasInt = Number(dias || 0);
    const appliedDailyRaw = valorDiario * 0.6667;
    const smldv = config.salarioMinimo / 30;
    const normalized = normalizeIncapacitySubtype(subtipo);

    const total = await calculateIncapacityWithPolicy(
      salarioBase, 
      diasInt, 
      subtipo, 
      policy,
      config.salarioMinimo
    );

    valor = total;
    factorCalculo = normalized === 'laboral' 
      ? Math.round(valorDiario) 
      : Math.round(Math.max(appliedDailyRaw, smldv));

    detalleCalculo = normalized === 'laboral'
      ? `Incapacidad laboral (ARL): ${diasInt} días × $${Math.round(valorDiario).toLocaleString()} = $${valor.toLocaleString()}`
      : policy.incapacity_policy === 'from_day1_66_with_floor'
        ? `Incapacidad general (política día 1 con piso): ${diasInt} días × máx(66.67% diario=$${Math.round(appliedDailyRaw).toLocaleString()}, SMLDV=$${Math.round(smldv).toLocaleString()}) = $${valor.toLocaleString()}`
        : diasInt <= 2
          ? `Incapacidad general estándar: ${diasInt} días × $${Math.round(valorDiario).toLocaleString()} = $${valor.toLocaleString()}`
          : (() => {
              const remaining = diasInt - 2;
              const appliedDaily = Math.max(appliedDailyRaw, smldv);
              const first2 = Math.round(valorDiario * 2);
              const rest = Math.round(appliedDaily * remaining);
              return `Incapacidad general estándar: 2d×$${Math.round(valorDiario).toLocaleString()} + ${remaining}d×máx(66.67% diario=$${Math.round(appliedDailyRaw).toLocaleString()}, SMLDV=$${Math.round(smldv).toLocaleString()}) = $${(first2 + rest).toLocaleString()}`
            })();

  } else if (tipoNovedad === 'horas_extra' || tipoNovedad === 'recargo_nocturno') {
    const horasNum = Number(horas || 0);
    let recargo = 0.25; // diurnas

    if (subtipo === 'nocturnas') recargo = 0.75;
    else if (subtipo === 'dominicales' || subtipo === 'festivas') recargo = 0.75;

    valor = Math.round(valorHora * horasNum * (1 + recargo));
    factorCalculo = 1 + recargo;
    detalleCalculo = `Horas ${subtipo || 'diurnas'}: ${horasNum} h × $${Math.round(valorHora).toLocaleString()} × ${(1 + recargo)} = $${valor.toLocaleString()}`;

  } else if (tipoNovedad === 'vacaciones' || tipoNovedad === 'licencia_remunerada') {
    const diasNum = Number(dias || 0);
    valor = Math.round(valorDiario * diasNum);
    factorCalculo = Math.round(valorDiario);
    detalleCalculo = `${tipoNovedad}: ${diasNum} días × $${Math.round(valorDiario).toLocaleString()} = $${valor.toLocaleString()}`;

  } else if (tipoNovedad === 'ausencia' || tipoNovedad === 'licencia_no_remunerada') {
    const diasNum = Number(dias || 0);
    valor = -Math.round(valorDiario * diasNum);
    factorCalculo = Math.round(valorDiario);
    detalleCalculo = `${tipoNovedad}: ${diasNum} días × $${Math.round(valorDiario).toLocaleString()} = $${valor.toLocaleString()}`;

  } else {
    // Fallback: valor manual o 0
    valor = 0;
    factorCalculo = 0;
    detalleCalculo = `Sin cálculo automático para tipo: ${tipoNovedad}`;
  }

  const result = {
    valor,
    factorCalculo,
    detalleCalculo,
    jornadaInfo: {
      horasSemanales,
      horasMensuales,
      divisorHorario: horasPorDia,
      valorHoraOrdinaria: Math.round(valorHora),
      ley: 'Código Sustantivo del Trabajo',
      descripcion: 'Cálculo basado en salario mensual con divisor horario estándar'
    }
  };

  console.log('✅ calculateSingleNovedad result:', result);
  return result;
}

async function validateEmployee(data: any) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.baseSalary || data.baseSalary <= 0) {
    errors.push('El salario base debe ser mayor a 0');
  }

  if (!data.workedDays || data.workedDays < 0 || data.workedDays > 30) {
    errors.push('Los días trabajados deben estar entre 0 y 30');
  }

  if (data.extraHours < 0) {
    warnings.push('Las horas extra no pueden ser negativas');
  }

  if (!data.eps) {
    warnings.push('EPS no especificada');
  }

  if (!data.afp) {
    warnings.push('AFP no especificada');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
