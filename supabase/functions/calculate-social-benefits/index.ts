
/** 
 * Edge Function: calculate-social-benefits
 * - Autenticada (usa JWT del usuario)
 * - Calcula cesantías, intereses de cesantías, prima y vacaciones
 * - ✅ CORREGIDO: Intereses = 12% de cesantías del período (Ley 50/1990 Art. 99)
 * - ✅ CORREGIDO: Auxilio de transporte 2025 = $200,000 fijo
 * - Opcionalmente guarda/actualizar el registro (upsert) en social_benefit_calculations
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // ✅ CORREGIDO: Usar salario mensual completo y auxilio fijo 2025
    const salarioMensual = Number(employee.salario_base) || 0;
    
    // ✅ AUXILIO DE TRANSPORTE 2025: $200,000 fijo según normativa
    const SMMLV_2025 = 1300000;
    const AUXILIO_TRANSPORTE_2025 = 200000; // Valor fijo legal 2025
    const auxilioMensual = salarioMensual <= (2 * SMMLV_2025) ? AUXILIO_TRANSPORTE_2025 : 0;
    
    // ✅ Base constitutiva: salario + auxilio (para cesantías, prima e intereses)
    const basePrestaciones = salarioMensual + auxilioMensual;

    let amount = 0;
    let formula = "";
    let cesantiaDelPeriodo = 0;

    console.log(`📊 Calculando ${body.benefitType} para ${days} días:`, {
      salarioMensual,
      auxilioMensual,
      basePrestaciones,
      benefitType: body.benefitType
    });

    if (body.benefitType === "intereses_cesantias") {
      // ✅ CORREGIDO: Intereses = 12% de la cesantía del período
      // Según Ley 50/1990 Art. 99 y Gerencie.com
      cesantiaDelPeriodo = (basePrestaciones * days) / 360.0;
      amount = cesantiaDelPeriodo * 0.12;
      formula = "intereses = cesantia_periodo * 0.12 = ((salario_mensual + auxilio_mensual) * dias / 360) * 0.12";
      
      console.log(`📈 Cálculo de intereses legal:`, {
        cesantiaDelPeriodo,
        rate: 0.12,
        amount,
        formula: `${cesantiaDelPeriodo.toFixed(2)} * 0.12 = ${amount.toFixed(2)}`
      });
    } else if (body.benefitType === "cesantias") {
      amount = (basePrestaciones * days) / 360.0;
      formula = "cesantias = (salario_mensual + auxilio_mensual) * dias / 360";
    } else if (body.benefitType === "prima") {
      amount = (basePrestaciones * days) / 360.0;
      formula = "prima = (salario_mensual + auxilio_mensual) * dias / 360";
    } else if (body.benefitType === "vacaciones") {
      // ✅ Vacaciones: solo salario base (sin auxilio)
      amount = (salarioMensual * days) / 720.0;
      formula = "vacaciones = salario_mensual * dias / 720 (sin auxilio transporte)";
    }

    const calculation_basis = {
      version: "4_legal_2025", // ✅ Nueva versión con cálculo legal
      period: { 
        start: startDate.toISOString().slice(0,10), 
        end: endDate.toISOString().slice(0,10), 
        days 
      },
      salario_mensual: salarioMensual,
      auxilio_mensual: auxilioMensual,
      base_prestaciones: basePrestaciones, // salario + auxilio
      smmlv_2025: SMMLV_2025,
      auxilio_transporte_2025: AUXILIO_TRANSPORTE_2025, // Valor fijo legal
      legal_reference: "Ley 50/1990 Art. 99 - Intereses 12% anual sobre cesantías",
      method: body.benefitType === "intereses_cesantias" ? "12pct_of_cesantia_period" : "standard_360_days"
    };

    const calculated_values = {
      salario_mensual: salarioMensual,
      auxilio_mensual: auxilioMensual,
      base_prestaciones: basePrestaciones,
      dias: days,
      formula,
      benefitType: body.benefitType,
      computedAt: new Date().toISOString()
    };

    // ✅ Valores específicos para intereses de cesantías
    if (body.benefitType === "intereses_cesantias") {
      Object.assign(calculated_values, {
        cesantia_del_periodo: cesantiaDelPeriodo,
        rate_applied: 0.12, // 12% anual
        method: "12pct_of_cesantia_period",
        legal_basis: "Ley 50/1990 Art. 99",
        calculation_detail: {
          step1_cesantia: `(${salarioMensual} + ${auxilioMensual}) * ${days} / 360 = ${cesantiaDelPeriodo.toFixed(2)}`,
          step2_intereses: `${cesantiaDelPeriodo.toFixed(2)} * 0.12 = ${amount.toFixed(2)}`
        }
      });
    }

    // ✅ PREVIEW MODE: If save is false, return preview
    if (body.save === false) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "preview",
          amount: Math.round(amount * 100) / 100, // 2 decimales para preview
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
      amount: Math.round(amount), // Redondear a peso completo para guardar
      estado: "calculado",
      notes: (body.notes || "") + " (Cálculo legal 2025: Ley 50/1990)",
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
