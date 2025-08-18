
/** 
 * Edge Function: calculate-social-benefits
 * - Autenticada (usa JWT del usuario)
 * - Calcula cesantías, intereses de cesantías y prima
 * - Opcionalmente guarda/actualiza el registro (upsert) en social_benefit_calculations
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima';

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

    const validTypes: BenefitType[] = ['cesantias', 'intereses_cesantias', 'prima'];
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
    const baseSalary = Number(employee.salario_base) || 0;
    const dailySalary = baseSalary / 30.0;

    let amount = 0;
    let formula = "";

    // Fórmulas simplificadas y legales base:
    // Cesantías = (Salario base * días) / 360
    // Intereses cesantías = Cesantías * 12% proporcional: (Salario base * días / 360) * 0.12
    // Prima = (Salario base * días) / 360
    if (body.benefitType === "cesantias") {
      amount = (baseSalary * days) / 360.0;
      formula = "amount = (baseSalary * days) / 360";
    } else if (body.benefitType === "intereses_cesantias") {
      amount = ((baseSalary * days) / 360.0) * 0.12;
      formula = "amount = ((baseSalary * days) / 360) * 0.12";
    } else if (body.benefitType === "prima") {
      amount = (baseSalary * days) / 360.0;
      formula = "amount = (baseSalary * days) / 360";
    }

    const calculation_basis = {
      version: 1,
      period: { start: body.periodStart, end: body.periodEnd, days },
      legalBase: "CO: cesantías, intereses (12% anual), prima - fórmula proporcional",
      assumptions: { includesOnlyBaseSalary: true, dailyDivisor: 30 }
    };

    const calculated_values = {
      baseSalary,
      dailySalary,
      days,
      formula,
      benefitType: body.benefitType,
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
      notes: body.notes || null,
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
