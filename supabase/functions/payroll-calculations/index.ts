
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
  valorManual?: number;
  cuotas?: number;
  fechaPeriodo?: string;
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

// ✅ NUEVO: Cálculo de totales de novedades (centralizado profesional)
interface NovedadesTotalsInput {
  salarioBase: number;
  fechaPeriodo?: string;
  novedades: Array<{
    tipo_novedad: string;
    subtipo?: string;
    valor?: number;
    dias?: number;
    horas?: number;
    constitutivo_salario?: boolean;
  }>;
}

interface NovedadesTotalsResult {
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  breakdown: Array<{
    tipo_novedad: string;
    subtipo?: string;
    valorOriginal?: number;
    valorCalculado: number;
    esDevengo: boolean;
    detalleCalculo?: string;
  }>;
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

// ✅ SIMPLIFICADO: Solo política de incapacidades (sin IBC mode)
type IncapacityPolicy = 'standard_2d_100_rest_66' | 'from_day1_66_with_floor'
interface CompanyPayrollPolicy {
  incapacity_policy: IncapacityPolicy;
}

// Helper para cliente Supabase con contexto del usuario
function getSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
}

// ✅ SIMPLIFICADO: Cargar solo política de incapacidades
async function getCompanyPolicy(req: Request): Promise<{ companyId: string | null; policy: CompanyPayrollPolicy }> {
  try {
    const supabase = getSupabaseClient(req);
    // Obtener company_id del usuario actual
    const { data: companyIdData, error: companyErr } = await supabase.rpc('get_current_user_company_id');
    if (companyErr || !companyIdData) {
      console.log('ℹ️ No company_id from context, using defaults.', companyErr?.message);
      return { companyId: null, policy: { incapacity_policy: 'standard_2d_100_rest_66' } };
    }

    // 1) Intentar leer desde company_settings
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('company_settings')
      .select('incapacity_policy')
      .eq('company_id', companyIdData)
      .limit(1)
      .single();

    if (settingsRow) {
      const incapacityPolicy = (settingsRow.incapacity_policy as IncapacityPolicy) || 'standard_2d_100_rest_66';
      console.log('🏢 Policy from company_settings:', { incapacityPolicy });
      return { companyId: companyIdData, policy: { incapacity_policy: incapacityPolicy } };
    } else if (settingsErr) {
      console.log('ℹ️ company_settings not available or columns missing, trying company_payroll_policies:', settingsErr.message);
    }

    // 2) Fallback a company_payroll_policies
    const { data: policyRows, error: polErr } = await supabase
      .from('company_payroll_policies')
      .select('incapacity_policy')
      .eq('company_id', companyIdData)
      .limit(1);

    if (polErr) {
      console.log('⚠️ Error fetching policy (fallback), using defaults:', polErr.message);
      return { companyId: companyIdData, policy: { incapacity_policy: 'standard_2d_100_rest_66' } };
    }

    const row = policyRows && policyRows[0];
    if (!row) {
      // Fallback por defecto si no hay fila creada
      return { companyId: companyIdData, policy: { incapacity_policy: 'standard_2d_100_rest_66' } };
    }

    return { companyId: companyIdData, policy: { incapacity_policy: row.incapacity_policy as IncapacityPolicy } };
  } catch (e) {
    console.log('⚠️ getCompanyPolicy fatal, using defaults:', e);
    return { companyId: null, policy: { incapacity_policy: 'standard_2d_100_rest_66' } };
  }
}

// Normalizador de subtipos de incapacidad
function normalizeIncapacitySubtype(subtipo?: string): 'general' | 'laboral' {
  const s = (subtipo || 'general').toLowerCase().trim();
  if (['laboral', 'arl', 'accidente_laboral', 'riesgo_laboral', 'at'].includes(s)) return 'laboral';
  return 'general'; // comun/común/eg/general → general
}

// ✅ NUEVA VERSIÓN con política: cálculo de incapacidad
function calculateIncapacityValuePolicyAware(
  baseSalary: number,
  days: number,
  subtipo: string | undefined,
  policy: CompanyPayrollPolicy,
  salarioMinimo: number
): number {
  const dailySalary = baseSalary / 30;
  const s = normalizeIncapacitySubtype(subtipo);

  console.log('🏥 Incapacity with policy:', {
    baseSalary, days, subtipo, normalized: s, policy, dailySalary, smlv: salarioMinimo
  });

  if (s === 'laboral') {
    // ARL paga 100% desde el día 1
    const value = Math.round(dailySalary * days);
    console.log('🏥 Laboral 100% value:', value);
    return value;
  }

  // general/común
  if (policy.incapacity_policy === 'from_day1_66_with_floor') {
    // Desde día 1 al 66.67% con piso diario SMLDV (SMLV/30)
    const daily66 = dailySalary * 0.6667;
    const smldv = salarioMinimo / 30;
    const dailyApplied = Math.max(daily66, smldv);
    const value = Math.round(dailyApplied * days);
    console.log('🏥 General with floor (from day 1): daily66, smldv, applied, total', daily66, smldv, dailyApplied, value);
    return value;
  }

  // Estándar: días 1-2 al 100%, 3+ al 66.67% con piso SMLDV
  if (days <= 2) {
    const value = Math.round(dailySalary * days);
    console.log('🏥 General standard ≤2 days (100%):', value);
    return value;
  } else {
    const smldv = salarioMinimo / 30;
    const first2 = dailySalary * 2; // 2 días al 100%
    const dailyRest = Math.max(dailySalary * 0.6667, smldv); // piso SMLDV desde el día 3
    const rest = dailyRest * (days - 2);
    const value = Math.round(first2 + rest);
    console.log('🏥 General standard >2 days with SMLDV floor: first2, dailyRest, restDays, total', first2, dailyRest, days - 2, value);
    return value;
  }
}

// ✅ Actualizamos el cálculo profesional de totales de novedades para usar política
function calculateNovedadesTotalsWithPolicy(input: any, policy: CompanyPayrollPolicy, salarioMinimo: number): any {
  const fecha = parseFecha(input.fechaPeriodo);
  let totalDevengos = 0;
  let totalDeducciones = 0;
  const breakdown: any[] = [];

  console.log('📊 BACKEND: Calculando totales de novedades con política:', {
    salarioBase: input.salarioBase,
    fechaPeriodo: input.fechaPeriodo,
    novedadesCount: input.novedades.length,
    policy
  });

  for (const novedad of input.novedades) {
    let valorCalculado = Number(novedad.valor || 0);
    let detalleCalculo = 'Valor manual';
    let esDevengo = true;
    let valorOriginal = valorCalculado;

    switch (novedad.tipo_novedad) {
      case 'incapacidad': {
        const dias = Number(novedad.dias || 0);
        if (dias > 0) {
          valorOriginal = valorCalculado;
          valorCalculado = calculateIncapacityValuePolicyAware(
            Number(input.salarioBase || 0),
            dias,
            novedad.subtipo,
            policy,
            salarioMinimo
          );
          const dailySalary = Number(input.salarioBase || 0) / 30;
          if (normalizeIncapacitySubtype(novedad.subtipo) === 'laboral') {
            detalleCalculo = `Incapacidad laboral: ${dias} días × 100% = ${valorCalculado.toLocaleString()}`;
          } else if (policy.incapacity_policy === 'from_day1_66_with_floor') {
            const smldv = salarioMinimo / 30;
            const daily66 = dailySalary * 0.6667;
            const dailyApplied = Math.max(daily66, smldv);
            detalleCalculo = `Incapacidad general (política día 1 con piso): ${dias} días × máx(66.67% diario, SMLDV=${Math.round(smldv)}) = ${valorCalculado.toLocaleString()}`;
          } else {
            const dias100 = Math.min(dias, 2);
            const diasResto = Math.max(dias - 2, 0);
            const smldv = salarioMinimo / 30;
            detalleCalculo = `Incapacidad general (estándar): ${dias100} días al 100% + ${diasResto} días × máx(66.67% diario, SMLDV=${Math.round(smldv)}) = ${valorCalculado.toLocaleString()}`;
          }
          console.log('🏥 Totals incapacidad calculada:', { valorOriginal, valorCalculado, detalleCalculo });
        }
        esDevengo = true;
        break;
      }

      case 'horas_extra': {
        const horas = Number(novedad.horas || 0);
        if (horas > 0) {
          valorOriginal = valorCalculado;
          const factor = getFactorHorasExtra(novedad.subtipo);
          const baseHora = calcularValorHoraExtraBase(Number(input.salarioBase || 0), fecha);
          valorCalculado = Math.round(baseHora * factor * horas);
          detalleCalculo = `Horas extra ${novedad.subtipo || 'diurnas'}: ${horas}h × ${factor}`;
        }
        esDevengo = true;
        break;
      }

      case 'recargo_nocturno': {
        const horas = Number(novedad.horas || 0);
        if (horas > 0) {
          valorOriginal = valorCalculado;
          const { factor, porcentaje } = getFactorRecargoBySubtype(novedad.subtipo, fecha);
          const divisor = 30 * 7.333;
          const valorHora = Number(input.salarioBase || 0) / divisor;
          valorCalculado = Math.round(valorHora * factor * horas);
          detalleCalculo = `Recargo ${novedad.subtipo || 'nocturno'}: ${horas}h × ${porcentaje}`;
        }
        esDevengo = true;
        break;
      }

      case 'vacaciones':
      case 'licencia_remunerada':
      case 'bonificacion':
      case 'comision':
      case 'prima':
      case 'otros_ingresos':
        esDevengo = true;
        break;

      case 'salud':
      case 'pension':
      case 'fondo_solidaridad':
      case 'retencion_fuente':
      case 'libranza':
      case 'ausencia':
      case 'multa':
      case 'descuento_voluntario':
      case 'licencia_no_remunerada':
        esDevengo = false;
        break;

      default:
        console.warn('⚠️ BACKEND: Tipo de novedad no clasificado:', novedad.tipo_novedad);
        esDevengo = true;
    }

    if (esDevengo) totalDevengos += valorCalculado;
    else totalDeducciones += Math.abs(valorCalculado);

    breakdown.push({
      tipo_novedad: novedad.tipo_novedad,
      subtipo: novedad.subtipo,
      valorOriginal,
      valorCalculado,
      esDevengo,
      detalleCalculo
    });
  }

  const totalNeto = totalDevengos - totalDeducciones;

  console.log('✅ BACKEND: Totales (policy-aware):', {
    totalDevengos,
    totalDeducciones,
    totalNeto,
    itemsProcessed: breakdown.length
  });

  return {
    totalDevengos: Math.round(totalDevengos),
    totalDeducciones: Math.round(totalDeducciones),
    totalNeto: Math.round(totalNeto),
    breakdown
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log('📊 Payroll calculation request:', { action, data });

    // Cargar política de la empresa del usuario
    const { policy } = await getCompanyPolicy(req);

    if (action === 'calculate-novedades-totals') {
      const input = data as any; // NovedadesTotalsInput
      if (!input.salarioBase || input.salarioBase <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Salario base inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      const config = getConfiguration(input.year);
      const result = calculateNovedadesTotalsWithPolicy(input, policy, config.salarioMinimo);
      return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'calculate-novedad') {
      const input = data as any; // NovedadCalculationInput
      const fecha = parseFecha(input.fechaPeriodo);
      const salario = Number(input.salarioBase || 0);

      if (!salario || salario <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Salario base inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const config = getConfiguration(input.year);
      let result: any | null = null;

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
        const valor = Math.round(
          calculateIncapacityValuePolicyAware(salario, dias, input.subtipo, policy, config.salarioMinimo)
        );
        const jornada = getJornadaLegalInfo(fecha);

        // Detalle según política y subtipo
        let detalle = '';
        const s = normalizeIncapacitySubtype(input.subtipo);
        if (s === 'laboral') {
          detalle = `Incapacidad laboral: ${dias} días × 100%`;
        } else if (policy.incapacity_policy === 'from_day1_66_with_floor') {
          const smldv = config.salarioMinimo / 30;
          detalle = `Incapacidad general: ${dias} días × máx(66.67% diario, SMLDV=${Math.round(smldv)})`;
        } else {
          const smldv = config.salarioMinimo / 30;
          const dias100 = Math.min(dias, 2);
          const diasResto = Math.max(dias - 2, 0);
          detalle = `Incapacidad general: ${dias100} días al 100% + ${diasResto} días × máx(66.67% diario, SMLDV=${Math.round(smldv)})`;
        }

        result = {
          valor,
          factorCalculo: dias,
          detalleCalculo: `${detalle} (política=${policy.incapacity_policy})`,
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

      return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'calculate') {
      const input = data as any; // PayrollCalculationInput
      const config = getConfiguration(input.year);

      console.log('⚙️ Using configuration:', config, 'Policy:', policy);

      // Base daily salary
      const dailySalary = input.baseSalary / 30;

      // Acumuladores
      let bonusesConstitutivos = 0;
      let bonusesNoConstitutivos = 0;
      let extraHours = 0;
      let additionalEarnings = 0;
      let additionalDeductions = 0;

      let totalIncapacityDays = 0;
      let totalIncapacityValue = 0;

      if (input.novedades && input.novedades.length > 0) {
        console.log('📋 Processing novedades:', input.novedades.length);

        for (const novedad of input.novedades) {
          const valorDB = Number(novedad.valor) || 0;
          const esConstitutivo = Boolean(novedad.constitutivo_salario);

          if (novedad.tipo_novedad === 'incapacidad') {
            const dias = Number(novedad.dias || 0);
            totalIncapacityDays += dias;

            // Recalcular según política (incluye piso SMLDV si aplica)
            const recalculated = calculateIncapacityValuePolicyAware(
              input.baseSalary,
              dias,
              novedad.subtipo,
              policy,
              config.salarioMinimo
            );
            totalIncapacityValue += Math.round(recalculated);
            additionalEarnings += Math.round(recalculated); // usar recalculado en devengos
            continue;
          }

          switch (novedad.tipo_novedad) {
            case 'horas_extra':
            case 'recargo_nocturno':
              extraHours += valorDB;
              additionalEarnings += valorDB;
              break;

            case 'bonificacion':
            case 'comision':
            case 'prima':
            case 'otros_ingresos':
              if (esConstitutivo) bonusesConstitutivos += valorDB;
              else bonusesNoConstitutivos += valorDB;
              additionalEarnings += valorDB;
              break;

            case 'retencion_fuente':
            case 'prestamo':
            case 'embargo':
            case 'descuento_voluntario':
            case 'fondo_solidaridad':
              additionalDeductions += valorDB;
              break;

            default:
              console.log('   ⚠️ Unclassified novedad type:', novedad.tipo_novedad);
          }
        }
      }

      // Días efectivamente trabajados = reportados - incapacidad
      const effectiveWorkedDays = Math.max(0, (input.workedDays || 0) - (totalIncapacityDays || 0));
      const transportLimit = config.salarioMinimo * 2;

      // Salario proporcional con días efectivos
      const proportionalSalary = Math.round(dailySalary * effectiveWorkedDays);

      // Auxilio transporte proporcional
      let transportAllowance = 0;
      if (input.baseSalary <= transportLimit) {
        const dailyTransport = config.auxilioTransporte / 30;
        transportAllowance = Math.round(dailyTransport * effectiveWorkedDays);
      }

      // Salario base para aportes tradicionales
      const salarioBaseParaAportes = proportionalSalary + bonusesConstitutivos + extraHours;

      // ✅ LÓGICA AUTOMÁTICA DE IBC: Si hay incapacidades, usar valor de incapacidad; si no, usar proporcional
      let ibcSalud: number;
      let ibcPension: number;

      if (totalIncapacityDays > 0 && totalIncapacityValue > 0) {
        // Automático: Si hay incapacidades, IBC basado en valor de incapacidad
        ibcSalud = totalIncapacityValue;
        ibcPension = totalIncapacityValue;
        console.log('🧮 IBC automático (incapacidad):', { totalIncapacityValue, totalIncapacityDays });
      } else {
        // Automático: Si no hay incapacidades, IBC proporcional
        if (input.baseSalary >= config.salarioMinimo) {
          ibcSalud = salarioBaseParaAportes;
          ibcPension = salarioBaseParaAportes;
        } else {
          const minIbc = (config.salarioMinimo / 30) * effectiveWorkedDays;
          ibcSalud = Math.max(salarioBaseParaAportes, minIbc);
          ibcPension = Math.max(salarioBaseParaAportes, minIbc);
        }
        console.log('🧮 IBC automático (proporcional):', { ibcSalud, effectiveWorkedDays });
      }

      // Total devengado
      const grossPay = proportionalSalary + transportAllowance + additionalEarnings;

      // Deducciones empleado
      const healthDeduction = Math.round(ibcSalud * PORCENTAJES_NOMINA.SALUD_EMPLEADO);
      const pensionDeduction = Math.round(ibcPension * PORCENTAJES_NOMINA.PENSION_EMPLEADO);
      const totalDeductions = healthDeduction + pensionDeduction + additionalDeductions;

      // Neto
      const netPay = grossPay - totalDeductions;

      // Aportes empleador
      const employerHealth = Math.round(ibcSalud * PORCENTAJES_NOMINA.SALUD_EMPLEADOR);
      const employerPension = Math.round(ibcPension * PORCENTAJES_NOMINA.PENSION_EMPLEADOR);
      const employerArl = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.ARL);
      const employerCaja = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.CAJA_COMPENSACION);
      const employerIcbf = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.ICBF);
      const employerSena = Math.round(salarioBaseParaAportes * PORCENTAJES_NOMINA.SENA);

      const employerContributions = employerHealth + employerPension + employerArl + employerCaja + employerIcbf + employerSena;
      const totalPayrollCost = netPay + employerContributions;

      const result = {
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

      console.log('✅ Calculation (automatic IBC) result:', {
        policy,
        totalIncapacityDays,
        totalIncapacityValue,
        ibcMode: totalIncapacityDays > 0 ? 'incapacity' : 'proportional',
        ibcSalud: result.ibc,
        healthDeduction: result.healthDeduction,
        pensionDeduction: result.pensionDeduction
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
      return new Response(JSON.stringify({ success: true, data: validation }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
