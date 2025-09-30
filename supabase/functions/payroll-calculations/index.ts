
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

/**
 * ===============================
 *  JORNADA LEGAL (KISS, LEY 2101)
 * ===============================
 * - Jornada laboral: transiciones 15/jul (2023→47, 2024→46, 2025→44, 2026→42)
 * - Recargos: divisor mensual 220h desde 01/jul/2025, antes usa jornada vigente
 */

// Fechas de vigencia de jornada semanal
const JORNADAS_LEGALES = [
  { fechaInicio: new Date('2026-07-15'), horasSemanales: 42, descripcion: 'Jornada final según Ley 2101 de 2021' },
  { fechaInicio: new Date('2025-07-15'), horasSemanales: 44, descripcion: 'Cuarta fase de reducción - Ley 2101 de 2021' },
  { fechaInicio: new Date('2024-07-15'), horasSemanales: 46, descripcion: 'Tercera fase de reducción - Ley 2101 de 2021' },
  { fechaInicio: new Date('2023-07-15'), horasSemanales: 47, descripcion: 'Segunda fase de reducción - Ley 2101 de 2021' },
  { fechaInicio: new Date('1950-01-01'), horasSemanales: 48, descripcion: 'Jornada máxima tradicional - Código Sustantivo del Trabajo' }
];

// Tabla fija de horas mensuales por jornada semanal
const HORAS_MENSUALES_POR_JORNADA: Record<number, number> = {
  48: 240,
  47: 235,
  46: 230,
  44: 220,
  42: 210
};

// Vigencia específica para RECARGOS (divisor mensual)
const getHorasParaRecargos = (fecha: Date): number => {
  if (fecha >= new Date('2025-07-01')) {
    console.log(`🎯 RECARGOS: Desde 1 julio 2025 → usando 220h mensuales`);
    return 220;
  }
  const j = getJornadaLegal(fecha);
  console.log(`🎯 RECARGOS: Jornada anterior → ${j.horasMensuales}h mensuales`);
  return j.horasMensuales;
};

// Jornada legal vigente para fecha dada
const getJornadaLegal = (fecha: Date) => {
  const vigente = [...JORNADAS_LEGALES]
    .sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime())
    .find(j => fecha >= j.fechaInicio) || JORNADAS_LEGALES[JORNADAS_LEGALES.length - 1];

  const horasMensuales = HORAS_MENSUALES_POR_JORNADA[vigente.horasSemanales];
  console.log(`✅ Jornada LABORAL: ${vigente.horasSemanales}h/sem → ${horasMensuales}h/mes (fecha ${fecha.toISOString().slice(0,10)})`);

  return {
    horasSemanales: vigente.horasSemanales,
    horasMensuales,
    fechaVigencia: vigente.fechaInicio,
    descripcion: vigente.descripcion,
    ley: 'Ley 2101 de 2021'
  };
};

// Horas por día (para horas extra): horasSemanales ÷ 6
const getDailyHours = (fecha: Date): number => {
  const j = getJornadaLegal(fecha);
  const h = j.horasSemanales / 6;
  console.log(`⏱️ Horas por día (extra): ${j.horasSemanales} ÷ 6 = ${h}`);
  return h;
};

// Valor base de la hora para horas extra (fórmula legal)
const calcularValorHoraExtraBase = (salarioMensual: number, fecha: Date): number => {
  const valorDiario = salarioMensual / 30;
  const horasPorDia = getDailyHours(fecha);
  const valorHora = valorDiario / horasPorDia;
  console.log(`💰 Valor hora base (EXTRA): salario/30=${Math.round(valorDiario)} ÷ horasPorDia=${horasPorDia.toFixed(3)} → ${Math.round(valorHora)}`);
  return valorHora;
};

// Valor base de la hora para recargos (divisor mensual)
const calcularValorHoraRecargoBase = (salarioMensual: number, fecha: Date): number => {
  const divisor = getHorasParaRecargos(fecha);
  const valorHora = salarioMensual / divisor;
  console.log(`💰 Valor hora base (RECARGO): salario=${salarioMensual} ÷ divisor=${divisor} → ${Math.round(valorHora)}`);
  return valorHora;
};

// ✅ Factor legal para horas extra COMPLETO - Cumplimiento normativo total
const getOvertimeFactor = (subtipoRaw?: string): number => {
  const s = String(subtipoRaw || '').toLowerCase().trim();
  
  // Horas extra nocturnas (75%)
  if (s === 'nocturnas' || s === 'nocturna') return 1.75;
  
  // Horas extra dominicales/festivas (75% = 1.75 factor)
  if (s === 'dominicales' || s === 'dominical') return 1.75;
  if (s === 'festivas' || s === 'festiva') return 1.75;
  
  // Casos específicos del frontend - ✅ CORRECCIÓN: Factores dominicales correctos
  if (s === 'dominicales_diurnas' || s === 'dominical_diurna') return 2.0; // 100%
  if (s === 'dominicales_nocturnas' || s === 'dominical_nocturna') return 2.5; // 150%
  if (s === 'festivas_diurnas' || s === 'festiva_diurna') return 2.0; // 100%
  if (s === 'festivas_nocturnas' || s === 'festiva_nocturna') return 2.5; // 150%
  if (s === 'nocturna_dominical') return 2.5; // 150%
  
  // Horas extra diurnas (25%)
  return 1.25;
};

// Normalizador simple
const normalize = (v?: string) => String(v || '').toLowerCase().trim();

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
      JSON.stringify({ success: false, error: (error as any).message }),
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
    console.log('ℹ️ Error loading company policies, using default:', (error as Error).message);
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
  let regularPay = 0; // ✅ Se calculará después de procesar novedades
  let extraPay = bonuses; // Legacy field compatibility

  // ✅ PROCESAR NOVEDADES CON POLÍTICAS
  console.log('📋 Processing novedades:', novedades.length);
  console.log('📋 NOVEDADES RAW:', JSON.stringify(novedades, null, 2));
  
  let totalIncapacityValue = 0;
  let totalIncapacityDays = 0;
  let totalConstitutiveNovedades = 0;

  for (const novedad of novedades) {
    console.log('🔍 Procesando novedad:', { 
      tipo: novedad.tipo_novedad, 
      dias: novedad.dias, 
      valor: novedad.valor,
      constitutivo: novedad.constitutivo_salario 
    });
    
    if (novedad.tipo_novedad === 'incapacidad') {
      const incapacityDays = novedad.dias || 0;
      console.log('🏥 INCAPACIDAD detectada - días:', incapacityDays);
      
      const incapacityValue = await calculateIncapacityWithPolicy(
        baseSalary, 
        incapacityDays, 
        novedad.subtipo, 
        policy,
        config.salarioMinimo
      );
      
      totalIncapacityValue += incapacityValue;
      totalIncapacityDays += incapacityDays;
      
      console.log('🏥 SUMA ACUMULADA - totalIncapacityDays:', totalIncapacityDays, 'totalIncapacityValue:', totalIncapacityValue);
      // ✅ NO sumar novedad.valor aquí - ya está calculado en totalIncapacityValue
    } else if (novedad.constitutivo_salario) {
      // Other constitutive novedades
      totalConstitutiveNovedades += novedad.valor || 0;
      extraPay += novedad.valor || 0;  // ✅ Solo para novedades NO-incapacidades
    } else {
      // ✅ Otras novedades (bonificaciones, etc.)
      extraPay += novedad.valor || 0;
    }
  }

  console.log('🔢 ANTES DE CALCULAR effectiveWorkedDays:', {
    workedDays,
    totalIncapacityDays,
    'novedades.length': novedades.length
  });
  
  // ✅ CÁLCULO NORMATIVO: Días efectivamente trabajados (sin incapacidades)
  const effectiveWorkedDays = Math.max(0, Math.min(workedDays - totalIncapacityDays, 30));
  
  // ✅ REGULARPY: Salario solo por días efectivamente trabajados
  regularPay = Math.round((dailySalary * effectiveWorkedDays) - absences);
  
  console.log('📊 CÁLCULO FINAL - Días trabajados:', { 
    workedDays, 
    totalIncapacityDays, 
    effectiveWorkedDays,
    baseSalary,
    dailySalary: Math.round(dailySalary),
    regularPay,
    absences
  });

  // ✅ Agregar valor calculado de incapacidades DESPUÉS del loop (una sola vez)
  extraPay += totalIncapacityValue;

  // ✅ AUXILIO DE TRANSPORTE PRORRATEADO: Solo si salario ≤ 2 SMMLV y según días EFECTIVAMENTE TRABAJADOS
  const transportLimit = getTransportAssistanceLimit(year);
  const eligibleForTransport = baseSalary <= transportLimit;
  const transportAllowance = eligibleForTransport ? Math.round((config.auxilioTransporte / 30) * effectiveWorkedDays) : 0;

  console.log('🚍 Auxilio Transporte:', {
    baseSalary,
    transportLimit,
    eligibleForTransport,
    periodType,
    workedDays,
    monthlyAmount: config.auxilioTransporte,
    proratedTransport: transportAllowance
  });

  // ✅ BACKEND AUTHORITATIVE FIX: Include prorated transport allowance in grossPay
  const grossPay = regularPay + extraPay + transportAllowance;

  // ✅ IBC SALUD/PENSIÓN: Incluye salario días trabajados + constitutivas + INCAPACIDADES (Decreto 1406/1999)
  const salarioProporcionalIBC = Math.round((baseSalary / 30) * effectiveWorkedDays);
  const ibcSalud = salarioProporcionalIBC + totalConstitutiveNovedades + totalIncapacityValue;
  
  // ✅ IBC PARAFISCALES: Solo salario días trabajados + constitutivas (SIN incapacidades)
  const ibcParafiscales = salarioProporcionalIBC + totalConstitutiveNovedades;
  
  console.log('🧮 IBC DETALLADO (Decreto 1406/1999 + Ley 100/1993):', { 
    salarioProporcionalIBC,
    totalConstitutiveNovedades,
    totalIncapacityValue,
    ibcSalud,
    ibcParafiscales,
    effectiveWorkedDays, 
    totalIncapacityDays,
    desglose: `${salarioProporcionalIBC} (salario) + ${totalConstitutiveNovedades} (constitutivas) + ${totalIncapacityValue} (incapacidad) = ${ibcSalud}`,
    note: 'IBC Salud incluye incapacidades, IBC Parafiscales NO'
  });

  const healthDeduction = Math.round(ibcSalud * 0.04);
  const pensionDeduction = Math.round(ibcSalud * 0.04);
  const totalDeductions = healthDeduction + pensionDeduction;

  // ✅ netPay now correctly calculated: grossPay (with transport) - deductions
  const netPay = grossPay - totalDeductions;

  // ✅ Employer contributions: Salud/Pensión/ARL usan ibcSalud, Parafiscales usan ibcParafiscales
  const employerHealth = Math.round(ibcSalud * 0.085);
  const employerPension = Math.round(ibcSalud * 0.12);
  const employerArl = Math.round(ibcSalud * 0.00522);
  const employerCaja = Math.round(ibcParafiscales * 0.04);
  const employerIcbf = Math.round(ibcParafiscales * 0.03);
  const employerSena = Math.round(ibcParafiscales * 0.02);

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

  console.log('✅ Calculation (normative IBC) result:', {
    policy,
    totalIncapacityDays,
    totalIncapacityValue,
    effectiveWorkedDays,
    ibcSalud,
    ibcParafiscales,
    healthDeduction,
    pensionDeduction,
    transportAllowance,
    grossPay: Math.round(grossPay),
    totalDeductions,
    netPay: Math.round(netPay)
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
  const breakdown = []; // ✅ NUEVO: Array de breakdown detallado

  // ✅ Bases de hora correctas según normativa
  const fecha = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
  const valorDiario = salarioBase / 30;
  const valorHoraExtraBase = calcularValorHoraExtraBase(salarioBase, fecha);
  const valorHoraRecargoBase = calcularValorHoraRecargoBase(salarioBase, fecha);

  console.log('⏱️ Bases de hora:', {
    salarioMensual: salarioBase,
    valorDiario,
    valorHoraExtraBase: Math.round(valorHoraExtraBase),
    valorHoraRecargoBase: Math.round(valorHoraRecargoBase)
  });

  for (const novedad of novedades) {
    const { tipo_novedad, subtipo, valor: valorOriginal, dias, horas } = novedad;

    let valorCalculado = valorOriginal || 0;
    let detalleCalculo = '';

    if (tipo_novedad === 'incapacidad') {
      // ✅ Recalcular incapacidades con política de empresa
      valorCalculado = await calculateIncapacityWithPolicy(
        salarioBase, 
        dias || 0, 
        subtipo, 
        policy,
        config.salarioMinimo
      );

      const diasInt = Number(dias || 0);
      const normalized = normalizeIncapacitySubtype(subtipo);
      const appliedDailyRaw = valorDiario * 0.6667;
      const smldv = config.salarioMinimo / 30;

      detalleCalculo = normalized === 'laboral'
        ? `Incapacidad laboral (ARL): ${diasInt} días × $${Math.round(valorDiario).toLocaleString()} = $${valorCalculado.toLocaleString()}`
        : policy.incapacity_policy === 'from_day1_66_with_floor'
          ? `Incapacidad general (política día 1 con piso): ${diasInt} días × máx(66.67% diario=$${Math.round(appliedDailyRaw).toLocaleString()}, SMLDV=$${Math.round(smldv).toLocaleString()}) = $${valorCalculado.toLocaleString()}`
          : diasInt <= 2
            ? `Incapacidad general estándar: ${diasInt} días × $${Math.round(valorDiario).toLocaleString()} = $${valorCalculado.toLocaleString()}`
            : (() => {
                const remaining = diasInt - 2;
                const appliedDaily = Math.max(appliedDailyRaw, smldv);
                const first2 = Math.round(valorDiario * 2);
                const rest = Math.round(appliedDaily * remaining);
                return `Incapacidad general estándar: 2d×$${Math.round(valorDiario).toLocaleString()} + ${remaining}d×máx(66.67% diario=$${Math.round(appliedDailyRaw).toLocaleString()}, SMLDV=$${Math.round(smldv).toLocaleString()}) = $${(first2 + rest).toLocaleString()}`
              })();

      console.log('🏥 Totals incapacidad calculada:', {
        valorOriginal,
        valorCalculado,
        detalleCalculo
      });
    } else if (tipo_novedad === 'horas_extra') {
      const horasNum = Number(horas || 0);
      if (horasNum > 0) {
        const factor = getOvertimeFactor(subtipo);
        valorCalculado = Math.round(valorHoraExtraBase * horasNum * factor);
        detalleCalculo = `Horas extra ${subtipo || 'diurnas'}: ${horasNum} h × $${Math.round(valorHoraExtraBase).toLocaleString()} × ${factor} = $${valorCalculado.toLocaleString()}`;

        console.log('🛠️ Horas extra (normativa):', {
          subtipo,
          horasNum,
          base: Math.round(valorHoraExtraBase),
          factor,
          valorCalculado
        });
      }
    } else if (tipo_novedad === 'recargo_nocturno') {
      // Solo recargo (35%) sobre base de recargos
      const horasNum = Number(horas || 0);
      if (horasNum > 0) {
        const recargo = 0.35;
        valorCalculado = Math.round(valorHoraRecargoBase * horasNum * recargo);
        detalleCalculo = `Recargo nocturno: ${horasNum} h × $${Math.round(valorHoraRecargoBase).toLocaleString()} × 0.35 = $${valorCalculado.toLocaleString()}`;

        console.log('🌙 Recargo nocturno:', {
          horasNum,
          base: Math.round(valorHoraRecargoBase),
          recargo,
          valorCalculado
        });
      }
    }

    // ✅ NUEVO: Agregar al breakdown detallado
    breakdown.push({
      tipo_novedad,
      subtipo: subtipo || 'default',
      valorOriginal,
      valorCalculado,
      detalleCalculo
    });

    // Clasificar como devengo o deducción
    if (['incapacidad', 'horas_extra', 'bonificacion', 'comision', 'prima', 'recargo_nocturno', 'recargo_dominical'].includes(tipo_novedad)) {
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
    itemsProcessed: novedades.length,
    breakdown // ✅ NUEVO: Incluir breakdown detallado
  };

  console.log('✅ BACKEND: Totales (policy-aware + jornada legal):', result);
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

  const fecha = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
  const j = getJornadaLegal(fecha);
  const valorDiario = salarioBase / 30;
  const valorHoraExtraBase = calcularValorHoraExtraBase(salarioBase, fecha);
  const valorHoraRecargoBase = calcularValorHoraRecargoBase(salarioBase, fecha);

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

  } else if (tipoNovedad === 'horas_extra') {
    const horasNum = Number(horas || 0);
    const factor = getOvertimeFactor(subtipo);
    valor = Math.round(valorHoraExtraBase * horasNum * factor);
    factorCalculo = factor;
    detalleCalculo = `Horas extra ${subtipo || 'diurnas'}: ${horasNum} h × $${Math.round(valorHoraExtraBase).toLocaleString()} × ${factor} = $${valor.toLocaleString()}`;

    console.log('🛠️ calculateSingleNovedad horas extra (normativa):', {
      subtipo,
      horasNum,
      baseExtra: Math.round(valorHoraExtraBase),
      factor,
      valor
    });

  } else if (tipoNovedad === 'recargo_nocturno' || tipoNovedad === 'recargo_dominical') {
    const horasNum = Number(horas || 0);
    // ✅ CORRECCIÓN: Factor dinámico basado en subtipo y fecha
    let factorRecargo = 0.35; // Default: nocturno ordinario (35%)
    let tipoDescripcion = 'nocturno';
    
    if (tipoNovedad === 'recargo_dominical') {
      // ✅ NUEVO: Recargo dominical puro con factores progresivos
      if (fecha < new Date('2025-07-01')) {
        factorRecargo = 0.75; // 75%
      } else if (fecha < new Date('2026-07-01')) {
        factorRecargo = 0.80; // 80%
      } else if (fecha < new Date('2027-07-01')) {
        factorRecargo = 0.90; // 90%
      } else {
        factorRecargo = 1.00; // 100%
      }
      tipoDescripcion = 'dominical';
    } else {
      const s = String(subtipo || '').toLowerCase().trim();
      if (s === 'dominical' || s === 'nocturno_dominical') {
        // ✅ CORRECCIÓN CRÍTICA: Nocturno (35%) + Dominical vigente
        const factorDominical = fecha < new Date('2025-07-01') ? 0.75 : 
                                 fecha < new Date('2026-07-01') ? 0.80 :
                                 fecha < new Date('2027-07-01') ? 0.90 : 1.00;
        factorRecargo = 0.35 + factorDominical; // Máximo 110%
        tipoDescripcion = 'nocturno dominical';
      } else if (s === 'nocturno') {
        factorRecargo = 0.35; // 35% para nocturno ordinario
        tipoDescripcion = 'nocturno';
      }
    }
    valor = Math.round(valorHoraRecargoBase * horasNum * factorRecargo);
    factorCalculo = factorRecargo;
    detalleCalculo = `Recargo ${tipoDescripcion}: ${horasNum} h × $${Math.round(valorHoraRecargoBase).toLocaleString()} × ${factorRecargo} = $${valor.toLocaleString()}`;

    console.log('🌙 calculateSingleNovedad recargo (CORREGIDO):', {
      subtipo,
      horasNum,
      baseRecargo: Math.round(valorHoraRecargoBase),
      factorRecargo,
      tipoDescripcion,
      valor
    });

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

  const horasMensualesRecargos = getHorasParaRecargos(fecha);
  const result = {
    valor,
    factorCalculo,
    detalleCalculo,
    jornadaInfo: {
      horasSemanales: j.horasSemanales,
      horasMensuales: (tipoNovedad === 'recargo_nocturno' || tipoNovedad === 'recargo_dominical') ? horasMensualesRecargos : j.horasMensuales,
      divisorHorario: (tipoNovedad === 'recargo_nocturno' || tipoNovedad === 'recargo_dominical') ? horasMensualesRecargos : (j.horasSemanales / 6),
      valorHoraOrdinaria: Math.round((tipoNovedad === 'recargo_nocturno' || tipoNovedad === 'recargo_dominical') ? valorHoraRecargoBase : valorHoraExtraBase),
      ley: 'Ley 2101 de 2021',
      descripcion: (tipoNovedad === 'recargo_nocturno' || tipoNovedad === 'recargo_dominical')
        ? 'Cálculo de recargo con divisor mensual legal (220h desde 01/07/2025)'
        : 'Cálculo de hora extra con horas por día (jornada legal vigente)'
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
