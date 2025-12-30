
/** 
 * Edge Function: calculate-social-benefits
 * - Autenticada (usa JWT del usuario)
 * - Calcula cesantías, intereses de cesantías, prima y vacaciones
 * - ✅ v5: Implementa salario variable según normativa colombiana
 * - ✅ Cesantías: Promedio último año si variable o variación (Art. 253 CST)
 * - ✅ Prima: Promedio del semestre (Art. 306 CST)
 * - ✅ Vacaciones: Promedio 12 meses calendario, sin HE ni dominicales (Art. 192 CST)
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// PARÁMETROS LEGALES 2025 (Decreto 2613/2024)
// ============================================================================
const SMMLV_2025 = 1423500;
const AUXILIO_TRANSPORTE_2025 = 200000;
const TOPE_AUXILIO_2025 = SMMLV_2025 * 2; // 2,847,000

type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima' | 'vacaciones';

interface CalculatePayload {
  employeeId: string;
  benefitType: BenefitType;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  periodId?: string;   // Opcional: para metadatos
  notes?: string;
  save?: boolean;
}

interface PayrollHistoryResult {
  payrolls: any[];
  totalDays: number;
  promedioMensual: number;
  promedioSinExtras: number;
  conceptosIncluidos: {
    salario_base: number;
    comisiones: number;
    bonificaciones: number;
    horas_extra: number;
    recargos: number;
  };
  tieneVariables: boolean;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function parseDate(value: string): Date | null {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function diffDaysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

// ============================================================================
// HELPER: Obtener historial de nóminas según período requerido
// ============================================================================
async function getPayrollHistory(
  supabase: SupabaseClient,
  employeeId: string,
  companyId: string,
  referenceDate: Date,
  periodType: 'ultimo_ano' | 'semestre' | '12_meses_calendario'
): Promise<PayrollHistoryResult> {
  let startDate: Date;
  const endDate = new Date(referenceDate);
  
  switch (periodType) {
    case 'ultimo_ano':
      startDate = new Date(referenceDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
      
    case 'semestre':
      const month = referenceDate.getMonth();
      startDate = new Date(referenceDate.getFullYear(), month < 6 ? 0 : 6, 1);
      break;
      
    case '12_meses_calendario':
      startDate = new Date(referenceDate);
      startDate.setMonth(startDate.getMonth() - 12);
      break;
  }

  console.log(`📊 getPayrollHistory [${periodType}]:`, {
    employeeId,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  });

  const { data: payrolls, error } = await supabase
    .from('payrolls')
    .select(`
      salario_base, 
      dias_trabajados,
      auxilio_transporte,
      comisiones,
      bonificaciones,
      horas_extra,
      horas_extra_diurnas,
      horas_extra_nocturnas,
      recargo_nocturno,
      recargo_dominical,
      period_id,
      payroll_periods_real!inner(fecha_inicio, fecha_fin)
    `)
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .gte('payroll_periods_real.fecha_fin', startDate.toISOString().slice(0, 10))
    .lte('payroll_periods_real.fecha_fin', endDate.toISOString().slice(0, 10));

  if (error) {
    console.error('❌ Error fetching payroll history:', error);
    return {
      payrolls: [],
      totalDays: 0,
      promedioMensual: 0,
      promedioSinExtras: 0,
      conceptosIncluidos: { salario_base: 0, comisiones: 0, bonificaciones: 0, horas_extra: 0, recargos: 0 },
      tieneVariables: false
    };
  }

  const records = payrolls || [];
  
  let totalDias = 0;
  let totalSalario = 0;
  let totalComisiones = 0;
  let totalBonificaciones = 0;
  let totalHorasExtra = 0;
  let totalRecargos = 0;

  for (const p of records) {
    totalDias += Number(p.dias_trabajados) || 0;
    totalSalario += Number(p.salario_base) || 0;
    totalComisiones += Number(p.comisiones) || 0;
    totalBonificaciones += Number(p.bonificaciones) || 0;
    totalHorasExtra += (Number(p.horas_extra) || 0) + 
                       (Number(p.horas_extra_diurnas) || 0) + 
                       (Number(p.horas_extra_nocturnas) || 0);
    totalRecargos += (Number(p.recargo_nocturno) || 0) + (Number(p.recargo_dominical) || 0);
  }

  const cantidadPeriodos = records.length || 1;
  const promedioTotal = (totalSalario + totalComisiones + totalBonificaciones + totalHorasExtra + totalRecargos) / cantidadPeriodos;
  const promedioSinExtras = (totalSalario + totalComisiones + totalBonificaciones + (totalRecargos / 2)) / cantidadPeriodos;
  const tieneVariables = totalComisiones > 0 || totalBonificaciones > 0;

  return {
    payrolls: records,
    totalDays: totalDias,
    promedioMensual: promedioTotal,
    promedioSinExtras,
    conceptosIncluidos: {
      salario_base: totalSalario / cantidadPeriodos,
      comisiones: totalComisiones / cantidadPeriodos,
      bonificaciones: totalBonificaciones / cantidadPeriodos,
      horas_extra: totalHorasExtra / cantidadPeriodos,
      recargos: totalRecargos / cantidadPeriodos
    },
    tieneVariables
  };
}

// ============================================================================
// HELPER: Detectar variación salarial en últimos 3 meses
// ============================================================================
async function detectarVariacionSalarial(
  supabase: SupabaseClient,
  employeeId: string,
  companyId: string
): Promise<{ tieneVariables: boolean; huboVariacion: boolean }> {
  const { data: recentPayrolls } = await supabase
    .from('payrolls')
    .select('salario_base, comisiones, bonificaciones')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(6);

  if (!recentPayrolls || recentPayrolls.length === 0) {
    return { tieneVariables: false, huboVariacion: false };
  }

  const tieneVariables = recentPayrolls.some(p => 
    (Number(p.comisiones) || 0) > 0 || 
    (Number(p.bonificaciones) || 0) > 0
  );

  const salarios = recentPayrolls.map(p => Number(p.salario_base) || 0);
  const primerSalario = salarios[0];
  const huboVariacion = salarios.some(s => s !== primerSalario);

  return { tieneVariables, huboVariacion };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }), {
        status: 405,
        headers: corsHeaders
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ success: false, error: "NOT_AUTHENTICATED" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const body: CalculatePayload = await req.json();

    // Validación básica
    if (!body?.employeeId || !body?.benefitType || !body?.periodStart || !body?.periodEnd) {
      return new Response(JSON.stringify({ success: false, error: "INVALID_INPUT" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Tipo de prestación válido
    const validTypes: BenefitType[] = ['cesantias', 'intereses_cesantias', 'prima', 'vacaciones'];
    if (!validTypes.includes(body.benefitType)) {
      return new Response(JSON.stringify({ success: false, error: "INVALID_BENEFIT_TYPE" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Fechas del período
    const startDate = parseDate(body.periodStart);
    const endDate = parseDate(body.periodEnd);
    if (!startDate || !endDate || startDate > endDate) {
      return new Response(JSON.stringify({ success: false, error: "INVALID_PERIOD_DATES" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const days = diffDaysInclusive(startDate, endDate);

    // Cargar empleado (sujeto a RLS)
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, company_id, salario_base, estado")
      .eq("id", body.employeeId)
      .maybeSingle();

    if (empError) {
      console.error("Employee fetch error:", empError);
      return new Response(JSON.stringify({ success: false, error: "EMPLOYEE_FETCH_ERROR" }), {
        status: 400,
        headers: corsHeaders
      });
    }
    if (!employee) {
      return new Response(JSON.stringify({ success: false, error: "EMPLOYEE_NOT_FOUND" }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const salarioMensual = Number(employee.salario_base) || 0;
    const auxilioMensual = salarioMensual <= TOPE_AUXILIO_2025 ? AUXILIO_TRANSPORTE_2025 : 0;

    // ============================================================================
    // DETECTAR SALARIO VARIABLE O VARIACIÓN
    // ============================================================================
    const variacionInfo = await detectarVariacionSalarial(supabase, body.employeeId, employee.company_id);
    const usarPromedio = variacionInfo.tieneVariables || variacionInfo.huboVariacion;

    let amount = 0;
    let formula = "";
    let cesantiaDelPeriodo = 0;
    let baseUsada = 0;
    let historialInfo: PayrollHistoryResult | null = null;

    console.log(`📊 Calculando ${body.benefitType} para ${days} días:`, {
      salarioMensual,
      auxilioMensual,
      usarPromedio,
      tieneVariables: variacionInfo.tieneVariables,
      huboVariacion: variacionInfo.huboVariacion
    });

    // ============================================================================
    // CÁLCULO SEGÚN TIPO DE PRESTACIÓN
    // ============================================================================
    if (body.benefitType === "cesantias") {
      // Art. 253 CST: Si variable o variación, usar promedio último año
      if (usarPromedio) {
        historialInfo = await getPayrollHistory(supabase, body.employeeId, employee.company_id, endDate, 'ultimo_ano');
        baseUsada = historialInfo.promedioMensual + auxilioMensual;
        formula = `cesantias = promedio_ultimo_año(${historialInfo.promedioMensual.toFixed(0)}) + auxilio(${auxilioMensual}) * ${days} / 360`;
      } else {
        baseUsada = salarioMensual + auxilioMensual;
        formula = `cesantias = (salario_mensual(${salarioMensual}) + auxilio(${auxilioMensual})) * ${days} / 360`;
      }
      amount = (baseUsada * days) / 360.0;
    } 
    else if (body.benefitType === "intereses_cesantias") {
      // Intereses = 12% de la cesantía del período
      if (usarPromedio) {
        historialInfo = await getPayrollHistory(supabase, body.employeeId, employee.company_id, endDate, 'ultimo_ano');
        baseUsada = historialInfo.promedioMensual + auxilioMensual;
      } else {
        baseUsada = salarioMensual + auxilioMensual;
      }
      cesantiaDelPeriodo = (baseUsada * days) / 360.0;
      amount = cesantiaDelPeriodo * 0.12;
      formula = `intereses = cesantia_periodo(${cesantiaDelPeriodo.toFixed(2)}) * 0.12`;
    } 
    else if (body.benefitType === "prima") {
      // Art. 306 CST: Promedio del semestre
      historialInfo = await getPayrollHistory(supabase, body.employeeId, employee.company_id, endDate, 'semestre');
      
      if (historialInfo.tieneVariables || historialInfo.payrolls.length > 1) {
        baseUsada = historialInfo.promedioMensual + auxilioMensual;
        formula = `prima = promedio_semestre(${historialInfo.promedioMensual.toFixed(0)}) + auxilio(${auxilioMensual}) * ${days} / 360`;
      } else {
        baseUsada = salarioMensual + auxilioMensual;
        formula = `prima = (salario_mensual(${salarioMensual}) + auxilio(${auxilioMensual})) * ${days} / 360`;
      }
      amount = (baseUsada * days) / 360.0;
    } 
    else if (body.benefitType === "vacaciones") {
      // Art. 192 CST: Si variable, promedio 12 meses SIN horas extra ni dominicales, SIN auxilio
      if (variacionInfo.tieneVariables) {
        historialInfo = await getPayrollHistory(supabase, body.employeeId, employee.company_id, endDate, '12_meses_calendario');
        baseUsada = historialInfo.promedioSinExtras;
        formula = `vacaciones = promedio_12_meses_sin_extras(${baseUsada.toFixed(0)}) * ${days} / 720`;
      } else {
        baseUsada = salarioMensual;
        formula = `vacaciones = salario_mensual(${salarioMensual}) * ${days} / 720`;
      }
      amount = (baseUsada * days) / 720.0;
    }

    // ============================================================================
    // AUDITORÍA: calculation_basis
    // ============================================================================
    const esPrimerSemestre = endDate.getMonth() < 6;
    
    const calculation_basis = {
      version: "5_variable_salary_2025",
      
      period: { 
        start: startDate.toISOString().slice(0,10), 
        end: endDate.toISOString().slice(0,10), 
        days 
      },
      
      tipo_salario: usarPromedio ? 'variable_o_variacion' : 'fijo',
      tiene_comisiones: variacionInfo.tieneVariables,
      hubo_variacion_3_meses: variacionInfo.huboVariacion,
      
      salario_mensual: salarioMensual,
      auxilio_mensual: auxilioMensual,
      base_usada: baseUsada,
      
      historial: historialInfo ? {
        periodos_considerados: historialInfo.payrolls.length,
        promedio_mensual: historialInfo.promedioMensual,
        promedio_sin_extras: historialInfo.promedioSinExtras,
        conceptos_incluidos: historialInfo.conceptosIncluidos
      } : null,
      
      parametros_2025: {
        smmlv: SMMLV_2025,
        auxilio_transporte: AUXILIO_TRANSPORTE_2025,
        tope_auxilio: TOPE_AUXILIO_2025
      },
      
      legal_references: {
        cesantias: "Art. 253 CST - Si variable o variación: promedio último año",
        intereses: "Ley 50/1990 Art. 99 - 12% anual sobre cesantías",
        prima: "Art. 306 CST - Promedio del semestre respectivo",
        vacaciones: "Art. 192 CST num. 2 - Promedio 12 meses, sin HE ni dominicales"
      }
    };

    const calculated_values = {
      salario_mensual: salarioMensual,
      auxilio_mensual: auxilioMensual,
      base_usada: baseUsada,
      dias: days,
      formula,
      benefitType: body.benefitType,
      computedAt: new Date().toISOString()
    };

    if (body.benefitType === "intereses_cesantias") {
      Object.assign(calculated_values, {
        cesantia_del_periodo: cesantiaDelPeriodo,
        rate_applied: 0.12,
        method: "12pct_of_cesantia_period",
        legal_basis: "Ley 50/1990 Art. 99"
      });
    }

    // PREVIEW MODE: If save is false, return preview
    if (body.save === false) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "preview",
          amount: Math.round(amount * 100) / 100,
          calculation_basis,
          calculated_values
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Guardar/Actualizar (upsert)
    const upsertPayload = {
      company_id: employee.company_id,
      employee_id: body.employeeId,
      benefit_type: body.benefitType,
      period_start: startDate.toISOString().slice(0,10),
      period_end: endDate.toISOString().slice(0,10),
      calculation_basis,
      calculated_values,
      amount: Math.round(amount),
      estado: "calculado",
      notes: (body.notes || "") + " (Cálculo legal v5 - Salario variable)",
      created_by: userData.user.id
    };

    const { data: record, error: upsertError } = await supabase
      .from("social_benefit_calculations")
      .upsert(upsertPayload, {
        onConflict: "company_id,employee_id,benefit_type,period_start,period_end",
        ignoreDuplicates: false
      })
      .select("*")
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ success: false, error: "UPSERT_FAILED", details: upsertError }), {
        status: 400,
        headers: corsHeaders
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: "saved",
        amount: Math.round(amount),
        record,
        calculation_basis,
        calculated_values
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ success: false, error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
