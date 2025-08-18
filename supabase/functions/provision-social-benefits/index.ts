
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima';

type CalculationRow = {
  company_id: string;
  employee_id: string;
  benefit_type: BenefitType;
  period_start: string;
  period_end: string;
  calculation_basis: any;
  calculated_values: any;
  amount: number;
  estado: string;
  notes: string;
  created_by: string;
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

    console.log('📅 Provisioning social benefits for period:', {
      id: period.id,
      periodo: period.periodo,
      start: period.fecha_inicio,
      end: period.fecha_fin,
      tipo: period.tipo_periodo,
      company_id: period.company_id,
    });

    // Get payrolls for the period
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

    const items: CalculationRow[] = [];

    for (const p of payrolls || []) {
      const employeeId = p.employee_id as string;
      const baseSalary = Number(p.salario_base) || 0;
      const workedDays = Number(p.dias_trabajados) || 0;
      const auxTrans = Number(p.auxilio_transporte) || 0;

      if (!employeeId || workedDays <= 0) continue;

      // Base constitutiva simple: salario + auxilio transporte
      const variableAverage = 0;
      const otherIncluded = 0;
      const baseTotal = baseSalary + auxTrans + variableAverage + otherIncluded;

      // Fórmulas de provisión (período -> días/360)
      const fraction = workedDays / 360;

      const cesantiasAmount = baseTotal * fraction;
      const interesesAmount = baseTotal * fraction * 0.12; // 12% anual sobre cesantías
      const primaAmount = baseTotal * fraction;

      const calculation_basis = {
        base_salary: baseSalary,
        variable_average: variableAverage,
        transport_allowance: auxTrans,
        other_included: otherIncluded,
        base_total: baseTotal,
        worked_days: workedDays,
        method: 'days_over_360',
        period: {
          id: period.id,
          periodo: period.periodo,
          start: period.fecha_inicio,
          end: period.fecha_fin,
          tipo: period.tipo_periodo,
        },
      };

      const calculated_values = {
        days_count: workedDays,
        formulas: {
          cesantias: 'base_total * (dias/360)',
          intereses_cesantias: 'base_total * (dias/360) * 0.12',
          prima: 'base_total * (dias/360)',
        },
        calculated_at: new Date().toISOString(),
      };

      const common = {
        company_id: period.company_id,
        employee_id: employeeId,
        period_start: period.fecha_inicio,
        period_end: period.fecha_fin,
        calculation_basis,
        calculated_values,
        estado: 'calculado',
        notes: 'Provisión generada automáticamente desde cierre de nómina',
        created_by: user.id,
      } as Omit<CalculationRow, 'benefit_type' | 'amount'>;

      items.push(
        { ...common, benefit_type: 'cesantias', amount: Math.round(cesantiasAmount) },
        { ...common, benefit_type: 'intereses_cesantias', amount: Math.round(interesesAmount) },
        { ...common, benefit_type: 'prima', amount: Math.round(primaAmount) },
      );
    }

    console.log('🧾 Calculated provision items:', { count: items.length });

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'no_items_to_provision', inserted: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert avoiding duplicates (unique: company_id, employee_id, benefit_type, period_start, period_end)
    const { data: upserted, error: upsertErr } = await supabase
      .from('social_benefit_calculations')
      .upsert(items, {
        onConflict: 'company_id,employee_id,benefit_type,period_start,period_end',
        ignoreDuplicates: false,
      })
      .select('id');

    if (upsertErr) {
      console.error('❌ calculations_upsert_error:', upsertErr);
      return new Response(
        JSON.stringify({ success: false, error: 'calculations_upsert_error', details: upsertErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Provisions upserted:', upserted?.length || 0);

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
