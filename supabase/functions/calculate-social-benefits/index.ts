
/** 
 * Edge Function: calculate-social-benefits
 * - Autenticada (usa JWT del usuario)
 * - Calcula cesantías, intereses de cesantías, prima y vacaciones
 * - 🔧 CORREGIDO: Usa base mensual completa para cálculos consistentes
 * - 🔧 NEW: Intereses de cesantías calculados como % de cesantías existentes
 * - Opcionalmente guarda/actualiza el registro (upsert) en social_benefit_calculations
 * - ✅ REHABILITADO: Se permiten simulaciones (save=false) para preview
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima' | 'vacaciones';

interface CalculatePayload {
  employeeId: string;
  benefitType: BenefitType;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  periodId?: string;   // Opcional: para obtener tipo_periodo
  notes?: string;
  save?: boolean;      // ✅ REHABILITADO: ahora sí se permiten previews
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

// 🔧 NEW: Function to infer periodicity from days or get from period
function inferPeriodicity(days: number, tipoPeriodo?: string): string {
  if (tipoPeriodo) {
    return tipoPeriodo; // Use explicit period type if available
  }
  
  // Infer from days
  if (days >= 28 && days <= 31) return 'mensual';
  if (days >= 13 && days <= 17) return 'quincenal';
  if (days === 7) return 'semanal';
  
  return 'custom'; // Fallback
}

// 🔧 NEW: Function to get interest rate based on periodicity
function getInterestRate(periodicidad: string): number | null {
  switch (periodicidad) {
    case 'mensual':
      return 0.01; // 1% mensual
    case 'quincenal':
      return 0.005; // 0.5% quincenal
    case 'semanal':
      return 0.12 / 52; // ~0.230769% semanal (12% anual / 52 semanas)
    default:
      return null; // Periodicidad no soportada
  }
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

    // 🔧 NEW: Get period data if periodId is provided
    let period = null;
    if (body.periodId) {
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('id, company_id, fecha_inicio, fecha_fin, tipo_periodo, estado')
        .eq('id', body.periodId)
        .maybeSingle();

      if (periodError) {
        console.error("Period fetch error:", periodError);
      } else {
        period = periodData;
      }
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

    // Coherencia de empresa entre empleado y período
    if (period && employee.company_id !== period.company_id) {
      return new Response(JSON.stringify({ success: false, error: "COMPANY_MISMATCH" }), {
        status: 400,
        headers: corsHeaders
      });
    }

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

    // 🔧 NEW: Special handling for intereses_cesantias
    if (body.benefitType === "intereses_cesantias") {
      // Infer periodicity
      const periodicidad = inferPeriodicity(days, period?.tipo_periodo);
      const interestRate = getInterestRate(periodicidad);
      
      if (interestRate === null) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "UNSUPPORTED_PERIODICITY",
          details: `Periodicidad "${periodicidad}" no soportada para cálculo de intereses`
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Look for existing cesantías for the same employee and period
      const { data: cesantiasRecord, error: cesantiasError } = await supabase
        .from("social_benefit_calculations")
        .select("amount, calculation_basis, calculated_values")
        .eq("company_id", employee.company_id)
        .eq("employee_id", body.employeeId)
        .eq("benefit_type", "cesantias")
        .eq("period_start", body.periodStart)
        .eq("period_end", body.periodEnd)
        .maybeSingle();

      if (cesantiasError) {
        console.error("Cesantías fetch error:", cesantiasError);
        return new Response(JSON.stringify({ success: false, error: "CESANTIAS_FETCH_ERROR" }), {
          status: 500,
          headers: corsHeaders
        });
      }

      if (!cesantiasRecord) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "MISSING_CESANTIAS_PERIOD",
          message: "Falta la cesantía del período. Primero calcúlala/guárdala."
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Calculate interest based on existing cesantías
      const cesantiasAmount = Number(cesantiasRecord.amount) || 0;
      amount = cesantiasAmount * interestRate;
      formula = `cesantias_amount * ${interestRate} (${periodicidad})`;

      console.log(`📈 Interest calculation: ${cesantiasAmount} * ${interestRate} = ${amount}`);
    } else {
      // 🔧 CORRECTED: Fórmulas con base mensual completa para otros beneficios
      if (body.benefitType === "cesantias") {
        amount = (baseConstitutivaTotal * days) / 360.0;
        formula = "amount = (salario_mensual + auxilio_mensual) * days / 360";
      } else if (body.benefitType === "prima") {
        amount = (baseConstitutivaTotal * days) / 360.0;
        formula = "amount = (salario_mensual + auxilio_mensual) * days / 360";
      } else if (body.benefitType === "vacaciones") {
        // 🔧 FIX: Vacaciones solo usa salario base (sin auxilio)
        amount = (fullMonthlySalary * days) / 720.0;
        formula = "amount = salario_mensual * days / 720 (sin auxilio transporte)";
      }
    }

    const calculation_basis = {
      version: 3, // 🔧 UPDATED: Version incremented due to interest fix
      period: { 
        start: startDate.toISOString().slice(0,10), 
        end: endDate.toISOString().slice(0,10), 
        days 
      },
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

    // 🔧 NEW: Enhanced calculated_values for interest calculations
    if (body.benefitType === "intereses_cesantias") {
      const periodicidad = inferPeriodicity(days, period?.tipo_periodo);
      const interestRate = getInterestRate(periodicidad)!;
      
      Object.assign(calculated_values, {
        rate_applied: interestRate,
        periodicity_used: periodicidad,
        interest_source: 'from_existing_cesantias'
      });
    }

    // ✅ PREVIEW MODE: If save is false, return preview
    if (body.save === false) {
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

    // Guardar/Actualizar (upsert) con unicidad por (company_id, employee_id, period_start, period_end, benefit_type)
    const upsertPayload = {
      company_id: employee.company_id,
      employee_id: body.employeeId,
      benefit_type: body.benefitType,
      period_start: startDate.toISOString().slice(0,10),
      period_end: endDate.toISOString().slice(0,10),
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
        onConflict: "company_id,employee_id,benefit_type,period_start,period_end", // 🔧 UPDATED: Remove period_id
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
