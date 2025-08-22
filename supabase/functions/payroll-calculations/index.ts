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

// Factor legal para horas extra (KISS: mantener dominical/festivo = 1.75 como venía en negocio)
const normalize = (v?: string) => String(v || '').toLowerCase().trim();

// ✅ NUEVO: recargo dominical/festivo dinámico por fecha (Ley 2466 de 2025)
const getRecargoDominicalFestivoPct = (fecha: Date): number => {
  // 75% hasta 30-jun-2025
  if (fecha < new Date('2025-07-01')) return 0.75;
  // 80% 01-jul-2025 a 30-jun-2026
  if (fecha < new Date('2026-07-01')) return 0.80;
  // 90% 01-jul-2026 a 30-jun-2027
  if (fecha < new Date('2027-07-01')) return 0.90;
  // 100% desde 01-jul-2027
  return 1.00;
};

// ❌ Reemplazamos la versión anterior por una con fecha y subtipos detallados
const getOvertimeFactor = (subtipoRaw?: string, fechaPeriodo?: Date): number => {
  const s = String(subtipoRaw || '').toLowerCase().trim();
  const fecha = fechaPeriodo || new Date();
  const recargoDom = getRecargoDominicalFestivoPct(fecha);

  // Base: extras simples
  if (s === 'diurnas' || s === 'diurna' || s === 'extra_diurna') {
    console.log('⏫ Factor HE diurna = 1.25');
    return 1.25;
  }
  if (s === 'nocturnas' || s === 'nocturna' || s === 'extra_nocturna') {
    console.log('⏫ Factor HE nocturna = 1.75');
    return 1.75;
  }

  // Combinadas con dominical/festivo (acumulables)
  if (['dominicales_diurnas','festivas_diurnas','dominical_diurna','festiva_diurna','domingo_diurna'].includes(s)) {
    const factor = 1 + 0.25 + recargoDom;
    console.log(`⏫ Factor HE dominical/festivo diurna = 1 + 0.25 + ${recargoDom} = ${factor} (fecha ${fecha.toISOString().slice(0,10)})`);
    return factor;
  }
  if (['dominicales_nocturnas','festivas_nocturnas','dominical_nocturna','festiva_nocturna','domingo_nocturna'].includes(s)) {
    const factor = 1 + 0.75 + recargoDom;
    console.log(`⏫ Factor HE dominical/festivo nocturna = 1 + 0.75 + ${recargoDom} = ${factor} (fecha ${fecha.toISOString().slice(0,10)})`);
    return factor;
  }

  // Genérico "dominicales"/"festivas" (asumir diurna por defecto)
  if (['dominicales','dominical','festivas','festiva','domingo','festivo'].includes(s)) {
    const factor = 1 + 0.25 + recargoDom;
    console.log(`⏫ Factor HE dominical/festivo (genérico → diurna) = 1 + 0.25 + ${recargoDom} = ${factor} (fecha ${fecha.toISOString().slice(0,10)})`);
    return factor;
  }

  // Default: diurna
  console.log('ℹ️ Subtipo HE no reconocido, usando diurna = 1.25. Subtipo recibido:', s);
  return 1.25;
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
    periodType = 'mensual',
    novedades = []
  } = data;

  console.log('📋 CÁLCULO NÓMINA CON PERIODICIDAD:', {
    periodType,
    baseSalary: baseSalary.toLocaleString(),
    workedDays,
    novedadesCount: novedades.length
  });

  // ✅ SAFETY NET: Re-calcular días de incapacidad en el período y días efectivos
  let totalIncapacityDaysInPeriod = 0;
  let totalIncapacityValue = 0;
  let totalConstitutiveNovedades = 0;

  // Calcular días legales del período
  const legalDays = periodType === 'quincenal' ? 15 : 30;

  console.log('📋 Processing novedades with safety net:', novedades.length);
  
  for (const novedad of novedades) {
    if (novedad.tipo_novedad === 'incapacidad') {
      // ✅ USAR días ya ajustados del período (viene del frontend)
      const incapacityDaysInPeriod = Math.min(novedad.dias || 0, legalDays);
      totalIncapacityDaysInPeriod += incapacityDaysInPeriod;

      // Calcular valor de incapacidad usando política
      const incapacityValue = await calculateIncapacityWithPolicy(
        baseSalary, 
        incapacityDaysInPeriod, 
        novedad.subtipo, 
        policy,
        config.salarioMinimo
      );
      totalIncapacityValue += incapacityValue;

      console.log('🏥 Incapacidad procesada (safety net):', {
        diasAjustados: incapacityDaysInPeriod,
        valor: incapacityValue
      });
    } else if (novedad.constitutivo_salario) {
      totalConstitutiveNovedades += novedad.valor || 0;
    }
  }

  // ✅ RECALCULAR días efectivos como safety net
  const effectiveWorkedDays = Math.max(0, Math.min(workedDays, legalDays - totalIncapacityDaysInPeriod));

  console.log('🎯 SAFETY NET - Días recalculados:', {
    legalDays,
    workedDaysInput: workedDays,
    totalIncapacityDaysInPeriod,
    effectiveWorkedDays
  });

  // ✅ CÁLCULO CORRECTO: Salario solo por días efectivos
  const dailySalary = baseSalary / 30;
  const regularPay = (dailySalary * effectiveWorkedDays) - absences;

  // ✅ EXTRAÑO: Solo bonuses y novedades NO incapacidad (incapacidad se suma separadamente)
  let extraPay = bonuses;
  for (const novedad of novedades) {
    if (novedad.tipo_novedad !== 'incapacidad') {
      extraPay += novedad.valor || 0;
    }
  }

  // ✅ GROSS PAY: Salario efectivo + extras + incapacidad calculada
  const grossPay = regularPay + extraPay + totalIncapacityValue;

  console.log('💰 GROSS PAY BREAKDOWN:', {
    regularPay: regularPay.toLocaleString(),
    extraPay: extraPay.toLocaleString(),
    incapacityValue: totalIncapacityValue.toLocaleString(),
    grossPay: grossPay.toLocaleString()
  });

  // ✅ IBC AUTOMÁTICO: Incapacidad vs Proporcional
  let ibcSalud: number;
  let ibcMode: string;

  if (totalIncapacityDaysInPeriod > 0) {
    ibcSalud = totalIncapacityValue;
    ibcMode = 'incapacity';
    console.log('🧮 IBC automático (incapacidad):', { totalIncapacityValue, totalIncapacityDaysInPeriod });
  } else {
    ibcSalud = Math.round((baseSalary / 30) * effectiveWorkedDays + totalConstitutiveNovedades);
    ibcMode = 'proportional';
    console.log('🧮 IBC automático (proporcional):', { ibcSalud, effectiveWorkedDays });
  }

  const healthDeduction = Math.round(ibcSalud * 0.04);
  const pensionDeduction = Math.round(ibcSalud * 0.04);
  const totalDeductions = healthDeduction + pensionDeduction;

  // ✅ AUXILIO DE TRANSPORTE: Basado en días efectivos (sin incapacidad)
  const transportAllowance = calculateTransportAllowance(
    baseSalary,
    effectiveWorkedDays,
    totalIncapacityDaysInPeriod,
    year,
    periodType
  );

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
    extraPay: Math.round(extraPay + totalIncapacityValue), // Total extras incluyendo incapacidad para compatibilidad
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
    ibc: ibcSalud
  };

  console.log('✅ RESULTADO FINAL CON DÍAS EFECTIVOS CORREGIDOS:', {
    periodType,
    policy,
    legalDays,
    effectiveWorkedDays,
    totalIncapacityDaysInPeriod,
    totalIncapacityValue: totalIncapacityValue.toLocaleString(),
    ibcMode,
    ibcSalud: ibcSalud.toLocaleString(),
    transportAllowance: transportAllowance.toLocaleString(),
    grossPay: result.grossPay.toLocaleString(),
    netPay: result.netPay.toLocaleString()
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
        detalleCalculo: `Incapacidad ${normalizeIncapacitySubtype(subtipo)} (política ${policy.incapacity_policy === 'from_day1_66_with_floor' ? 'día 1 con piso' : 'estándar'}): ${dias} días`
      });
    } else if (tipo_novedad === 'horas_extra') {
      const horasNum = Number(horas || 0);
      if (horasNum > 0) {
        const factor = getOvertimeFactor(subtipo, fecha); // ✅ PASAMOS FECHA
        valorCalculado = Math.round(valorHoraExtraBase * horasNum * factor);

        console.log('🛠️ Horas extra (normativa dinámica):', {
          subtipo,
          horasNum,
          base: Math.round(valorHoraExtraBase),
          factor,
          fecha: fecha.toISOString().slice(0,10),
          detalle: 'Factor incluye recargo dominical/festivo dinámico cuando aplica'
        });
      }
    } else if (tipo_novedad === 'recargo_nocturno') {
      // Solo recargo (35%) sobre base de recargos
      const horasNum = Number(horas || 0);
      if (horasNum > 0) {
        const recargo = 0.35;
        valorCalculado = Math.round(valorHoraRecargoBase * horasNum * recargo);

        console.log('🌙 Recargo nocturno:', {
          horasNum,
          base: Math.round(valorHoraRecargoBase),
          recargo,
          valorCalculado
        });
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
    const factor = getOvertimeFactor(subtipo, fecha); // ✅ PASAMOS FECHA
    valor = Math.round(valorHoraExtraBase * horasNum * factor);
    factorCalculo = factor;
    detalleCalculo = `Horas extra ${subtipo || 'diurnas'}: ${horasNum} h × $${Math.round(valorHoraExtraBase).toLocaleString()} × ${factor} = $${valor.toLocaleString()}`;

    console.log('🛠️ calculateSingleNovedad horas extra (normativa dinámica):', {
      subtipo,
      horasNum,
      baseExtra: Math.round(valorHoraExtraBase),
      factor,
      fecha: fecha.toISOString().slice(0,10)
    });

  } else if (tipoNovedad === 'recargo_nocturno') {
    const horasNum = Number(horas || 0);
    const recargo = 0.35;
    valor = Math.round(valorHoraRecargoBase * horasNum * recargo);
    factorCalculo = recargo;
    detalleCalculo = `Recargo nocturno: ${horasNum} h × $${Math.round(valorHoraRecargoBase).toLocaleString()} × 0.35 = $${valor.toLocaleString()}`;

    console.log('🌙 calculateSingleNovedad recargo nocturno:', {
      horasNum,
      baseRecargo: Math.round(valorHoraRecargoBase),
      recargo,
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
      horasMensuales: tipoNovedad === 'recargo_nocturno' ? horasMensualesRecargos : j.horasMensuales,
      divisorHorario: tipoNovedad === 'recargo_nocturno' ? horasMensualesRecargos : (j.horasSemanales / 6),
      valorHoraOrdinaria: Math.round(tipoNovedad === 'recargo_nocturno' ? valorHoraRecargoBase : valorHoraExtraBase),
      ley: 'Ley 2101 de 2021',
      descripcion: tipoNovedad === 'recargo_nocturno'
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

/**
 * ✅ NUEVA FUNCIÓN KISS: Cálculo correcto de auxilio de transporte prorrateado
 */
const calculateTransportAllowance = (
  baseSalary: number,
  workedDays: number,
  totalIncapacityDays: number,
  year: string,
  periodType: 'quincenal' | 'mensual'
): number => {
  const config = OFFICIAL_VALUES[year as keyof typeof OFFICIAL_VALUES] || OFFICIAL_VALUES['2025'];
  const transportLimit = getTransportAssistanceLimit(year);
  
  // 🔍 VALIDACIÓN: Solo si salario base <= 2 SMMLV
  if (baseSalary > transportLimit) {
    console.log(`🚫 AUXILIO TRANSPORTE: Salario ${baseSalary.toLocaleString()} > límite ${transportLimit.toLocaleString()}`);
    return 0;
  }
  
  // 🧮 CÁLCULO LEGAL: Días elegibles = días trabajados - días de incapacidad
  const eligibleDays = Math.max(workedDays - totalIncapacityDays, 0);
  
  // 🎯 FÓRMULA NORMATIVA: (auxilio_mensual / 30) × días_elegibles
  const dailyAllowance = config.auxilioTransporte / 30;
  const proratedAllowance = Math.round(dailyAllowance * eligibleDays);
  
  console.log(`🚌 AUXILIO TRANSPORTE PRORRATEADO (${periodType}):`, {
    salario: baseSalary.toLocaleString(),
    limite: transportLimit.toLocaleString(),
    diasTrabajados: workedDays,
    diasIncapacidad: totalIncapacityDays,
    diasElegibles: eligibleDays,
    auxilioDiario: Math.round(dailyAllowance).toLocaleString(),
    auxilioCalculado: proratedAllowance.toLocaleString()
  });
  
  return proratedAllowance;
};
