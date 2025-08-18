
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ProvisionRow = {
  company_id: string;
  period_id: string;
  employee_id: string;
  benefit_type: 'cesantias' | 'prima' | 'intereses_cesantias';
  base_salary: number;
  variable_average: number;
  transport_allowance: number;
  other_included: number;
  calculation_breakdown: any;
  days_count: number;
  provision_amount: number;
  calculation_method: string;
  source: string;
  calculated_by: string | null;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { period_id } = await req.json().catch(() => ({}));
    if (!period_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_period_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Identify user (for auditing)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get period
    const { data: period, error: periodErr } = await supabase
      .from('payroll_periods_real')
      .select('id, company_id, fecha_inicio, fecha_fin, tipo_periodo, periodo')
      .eq('id', period_id)
      .single();

    if (periodErr || !period) {
      return new Response(
        JSON.stringify({ success: false, error: 'period_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get payrolls for the period (employee_id, base, days, aux transporte)
    const { data: payrolls, error: payrollsErr } = await supabase
      .from('payrolls')
      .select('employee_id, salario_base, dias_trabajados, auxilio_transporte')
      .eq('period_id', period.id)
      .eq('company_id', period.company_id);

    if (payrollsErr) {
      return new Response(
        JSON.stringify({ success: false, error: 'payrolls_query_error', details: payrollsErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const items: ProvisionRow[] = [];

    for (const p of payrolls || []) {
      const employeeId = p.employee_id as string;
      const baseSalary = Number(p.salario_base) || 0;
      const workedDays = Number(p.dias_trabajados) || 0;
      const auxTrans = Number(p.auxilio_transporte) || 0;

      if (!employeeId || workedDays <= 0) continue;

      // Base constitutiva simple (extensible): salario + auxilio transporte
      const variableAverage = 0;
      const otherIncluded = 0;
      const baseTotal = baseSalary + auxTrans + variableAverage + otherIncluded;

      // Fórmulas de provisión (período -> días/360)
      const fraction = workedDays / 360;

      const cesantiasAmount = baseTotal * fraction; // ~ 8.33% mensual si 30 días
      const interesesAmount = baseTotal * fraction * 0.12; // 12% anual sobre cesantías
      const primaAmount = baseTotal * fraction; // ~ 8.33% mensual si 30 días

      const breakdown = {
        base_salary: baseSalary,
        variable_average: variableAverage,
        transport_allowance: auxTrans,
        other_included: otherIncluded,
        base_total: baseTotal,
        worked_days: workedDays,
        formulas: {
          cesantias: 'base_total * (dias/360)',
          intereses_cesantias: 'base_total * (dias/360) * 0.12',
          prima: 'base_total * (dias/360)',
        },
        period: {
          id: period.id,
          periodo: period.periodo,
          start: period.fecha_inicio,
          end: period.fecha_fin,
          tipo: period.tipo_periodo,
        },
      };

      const common: Omit<ProvisionRow, 'benefit_type' | 'provision_amount'> = {
        company_id: period.company_id,
        period_id: period.id,
        employee_id: employeeId,
        base_salary: baseSalary,
        variable_average: variableAverage,
        transport_allowance: auxTrans,
        other_included: otherIncluded,
        calculation_breakdown: breakdown,
        days_count: workedDays,
        calculation_method: 'days_over_360',
        source: 'payroll_closure',
        calculated_by: user.id,
      };

      items.push(
        { ...common, benefit_type: 'cesantias', provision_amount: Math.round(cesantiasAmount) },
        { ...common, benefit_type: 'intereses_cesantias', provision_amount: Math.round(interesesAmount) },
        { ...common, benefit_type: 'prima', provision_amount: Math.round(primaAmount) },
      );
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'no_items_to_provision', inserted: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert avoiding duplicates (unique: company_id, period_id, employee_id, benefit_type)
    const { data: upserted, error: upsertErr } = await supabase
      .from('social_benefit_provisions')
      .upsert(items, {
        onConflict: 'company_id,period_id,employee_id,benefit_type',
        ignoreDuplicates: false,
      })
      .select('id');

    if (upsertErr) {
      return new Response(
        JSON.stringify({ success: false, error: 'provisions_upsert_error', details: upsertErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'provisions_recorded',
        count: upserted?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('provision-social-benefits error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'unexpected', details: String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
