
/** 
 * Edge Function: calculate-social-benefits
 * - Autenticada (usa JWT del usuario)
 * - Calcula cesantías, intereses de cesantías, prima y vacaciones
 * - 🔧 CORREGIDO: Usa base mensual completa para cálculos consistentes
 * - Opcionalmente guarda/actualiza el registro (upsert) en social_benefit_calculations
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima' | 'vacaciones';

interface CalculatePayload {
  employeeId: string;
  benefitType: BenefitType;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  notes?: string;
  save?: boolean;      // default false
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

    const validTypes: BenefitType[] = ['cesantias', 'intereses_cesantias', 'prima', 'vacaciones'];
    if (!validTypes.includes(body.benefitType)) {
      return new Response(JSON.stringify({ success: false, error: "INVALID_BENEFIT_TYPE" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const startDate = parseDate(body.periodStart);
    const endDate = parseDate(body.periodEnd);
    if (!startDate || !endDate || startDate > endDate) {
      return new Response(JSON.stringify({ success: false, error: "INVALID_PERIOD_DATES" }), {
        status: 400,
        headers: corsHeaders
      });
    }

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

    const days = diffDaysInclusive(startDate, endDate);
    
    // 🔧 FIX: Use full monthly salary consistently
    const fullMonthlySalary = Number(employee.salario_base) || 0;
    
    // 🔧 FIX: Calculate full monthly auxilio (Colombian legal standards 2025)
    const SMMLV_2025 = 1300000; // Salario mínimo 2025
    const AUXILIO_TRANSPORTE_2025 = Math.round(SMMLV_2025 * 0.15); // 15% del SMMLV
    const fullMonthlyAuxilio = fullMonthlySalary <= (2 * SMMLV_2025) ? AUXILIO_TRANSPORTE_2025 : 0;
    
    // 🔧 FIX: Base constitutiva uses full monthly amounts
    const baseConstitutivaTotal = fullMonthlySalary + fullMonthlyAuxilio;

    let amount = 0;
    let formula = "";

    // 🔧 CORRECTED: Fórmulas con base mensual completa
    if (body.benefitType === "cesantias") {
      amount = (baseConstitutivaTotal * days) / 360.0;
      formula = "amount = (salario_mensual + auxilio_mensual) * days / 360";
    } else if (body.benefitType === "intereses_cesantias") {
      amount = ((baseConstitutivaTotal * days) / 360.0) * 0.12;
      formula = "amount = ((salario_mensual + auxilio_mensual) * days / 360) * 0.12";
    } else if (body.benefitType === "prima") {
      amount = (baseConstitutivaTotal * days) / 360.0;
      formula = "amount = (salario_mensual + auxilio_mensual) * days / 360";
    } else if (body.benefitType === "vacaciones") {
      // 🔧 FIX: Vacaciones solo usa salario base (sin auxilio)
      amount = (fullMonthlySalary * days) / 720.0;
      formula = "amount = salario_mensual * days / 720 (sin auxilio transporte)";
    }

    const calculation_basis = {
      version: 2, // 🔧 UPDATED: Version incremented due to fix
      period: { start: body.periodStart, end: body.periodEnd, days },
      full_monthly_salary: fullMonthlySalary, // 🔧 NEW
      full_monthly_auxilio: fullMonthlyAuxilio, // 🔧 NEW
      base_constitutiva_total: baseConstitutivaTotal, // 🔧 NEW
      smmlv_2025: SMMLV_2025, // 🔧 NEW
      auxilio_rate: 0.15, // 🔧 NEW
      legalBase: "CO: cesantías, intereses (12% anual), prima - base constitutiva mensual completa",
      corrections: "Corregido: usar salario + auxilio mensual completo, no proporcional del período"
    };

    const calculated_values = {
      fullMonthlySalary, // 🔧 UPDATED
      fullMonthlyAuxilio, // 🔧 NEW
      baseConstitutivaTotal, // 🔧 NEW
      days,
      formula,
      benefitType: body.benefitType,
      calculation_method: "monthly_base_proportional", // 🔧 NEW
      computedAt: new Date().toISOString()
    };

    // Si no se debe guardar, devolver preview
    const shouldSave = body.save === true;
    if (!shouldSave) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "preview",
          amount,
          calculation_basis,
          calculated_values
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Guardar/Actualizar (upsert) con unicidad por (company_id, employee_id, benefit_type, period_start, period_end)
    const upsertPayload = {
      company_id: employee.company_id,
      employee_id: body.employeeId,
      benefit_type: body.benefitType,
      period_start: body.periodStart,
      period_end: body.periodEnd,
      calculation_basis,
      calculated_values,
      amount,
      estado: "calculado",
      notes: (body.notes || "") + " (Corregido: base mensual completa)",
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
      return new Response(JSON.stringify({ success: false, error: "UPSERT_FAILED" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: "saved",
        amount,
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
