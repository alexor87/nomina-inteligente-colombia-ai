
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima' | 'vacaciones';

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
  period_id?: string; // ✅ nuevo campo requerido por la migración
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

    // Get period and validate it's closed
    const { data: period, error: periodErr } = await supabase
      .from('payroll_periods_real')
      .select('id, company_id, fecha_inicio, fecha_fin, tipo_periodo, periodo, estado')
      .eq('id', period_id)
      .single();

    if (periodErr || !period) {
      return new Response(
        JSON.stringify({ success: false, error: 'period_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Validate period is closed
    if (period.estado !== 'cerrado') {
      console.log('❌ Period is not closed:', period.estado);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'period_not_closed',
          message: `El período debe estar cerrado para calcular provisiones. Estado actual: ${period.estado}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📅 Provisioning social benefits for closed period:', {
      id: period.id,
      periodo: period.periodo,
      start: period.fecha_inicio,
      end: period.fecha_fin,
      tipo: period.tipo_periodo,
      company_id: period.company_id,
      estado: period.estado,
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

    // Get employee data for full monthly salary and auxilio
    const employeeIds = [...new Set(payrolls?.map(p => p.employee_id) || [])];
    const { data: employees, error: employeesErr } = await supabase
      .from('employees')
      .select('id, salario_base')
      .in('id', employeeIds);

    if (employeesErr) {
      return new Response(
        JSON.stringify({ success: false, error: 'employees_query_error', details: employeesErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const employeesMap = new Map();
    employees?.forEach(emp => {
      employeesMap.set(emp.id, emp);
    });

    const items: CalculationRow[] = [];

    for (const p of payrolls || []) {
      const employeeId = p.employee_id as string;
      const workedDays = Number(p.dias_trabajados) || 0;
      
      // 🔧 FIX: Use full monthly salary from employees table
      const employee = employeesMap.get(employeeId);
      const fullMonthlySalary = Number(employee?.salario_base) || 0;
      
      // 🔧 FIX: Calculate full monthly auxilio (117.172 COP for 2025)
      const SMMLV_2025 = 1300000; // Salario mínimo 2025
      const AUXILIO_TRANSPORTE_2025 = Math.round(SMMLV_2025 * 0.15); // 15% del SMMLV
      const fullMonthlyAuxilio = fullMonthlySalary <= (2 * SMMLV_2025) ? AUXILIO_TRANSPORTE_2025 : 0;

      if (!employeeId || workedDays <= 0 || fullMonthlySalary <= 0) continue;

      // Base constitutiva: salario mensual completo + auxilio mensual completo
      const variableAverage = 0;
      const otherIncluded = 0;
      
      // 🔧 FIX: Base constitutiva now uses full monthly amounts
      const baseConstitutivaTotal = fullMonthlySalary + fullMonthlyAuxilio + variableAverage + otherIncluded;

      // Fórmulas de provisión (proporcionalmente por días trabajados)
      const fraction = workedDays / 360;

      const cesantiasAmount = baseConstitutivaTotal * fraction;
      const interesesAmount = baseConstitutivaTotal * fraction * 0.12; // 12% anual sobre cesantías
      const primaAmount = baseConstitutivaTotal * fraction;
      
      // 🔧 FIX: Vacaciones: solo salario base mensual (sin auxilio transporte) * días / 720
      const vacacionesAmount = fullMonthlySalary * workedDays / 720;

      const calculation_basis = {
        full_monthly_salary: fullMonthlySalary, // 🔧 NEW: Salario mensual completo
        full_monthly_auxilio: fullMonthlyAuxilio, // 🔧 NEW: Auxilio mensual completo
        variable_average: variableAverage,
        other_included: otherIncluded,
        base_constitutiva_total: baseConstitutivaTotal, // 🔧 NEW: Base constitutiva total
        worked_days: workedDays,
        method: 'days_over_360_with_monthly_base', // 🔧 UPDATED: Method name
        smmlv_2025: SMMLV_2025,
        auxilio_rate: 0.15,
        period: {
          id: period.id,
          periodo: period.periodo,
          start: period.fecha_inicio,
          end: period.fecha_fin,
          tipo: period.tipo_periodo,
        },
        // 🔧 NEW: Legacy fields for backward compatibility
        base_salary: fullMonthlySalary,
        transport_allowance: fullMonthlyAuxilio,
        base_total: baseConstitutivaTotal,
      };

      const calculated_values = {
        days_count: workedDays,
        formulas: {
          cesantias: 'base_constitutiva_total * (dias/360)',
          intereses_cesantias: 'base_constitutiva_total * (dias/360) * 0.12',
          prima: 'base_constitutiva_total * (dias/360)',
          vacaciones: 'full_monthly_salary * (dias/720) - Nota: solo salario base, sin auxilio',
        },
        calculation_method: 'monthly_base_proportional', // 🔧 NEW: Clear method identifier
        calculated_at: new Date().toISOString(),
      };

      const common = {
        company_id: period.company_id,
        employee_id: employeeId,
        period_start: period.fecha_inicio,
        period_end: period.fecha_fin,
        period_id: period.id, // ✅ incluir period_id (requerido)
        calculation_basis,
        calculated_values,
        estado: 'calculado',
        notes: 'Provisión con base mensual completa (corregida)',
        created_by: user.id,
      } as Omit<CalculationRow, 'benefit_type' | 'amount'>;

      items.push(
        { ...common, benefit_type: 'cesantias', amount: Math.round(cesantiasAmount) },
        { ...common, benefit_type: 'intereses_cesantias', amount: Math.round(interesesAmount) },
        { ...common, benefit_type: 'prima', amount: Math.round(primaAmount) },
        { ...common, benefit_type: 'vacaciones', amount: Math.round(vacacionesAmount) },
      );
    }

    console.log('🧾 Calculated provision items with corrected monthly base:', { count: items.length });

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'no_items_to_provision', inserted: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert avoiding duplicates (unique: company_id, employee_id, benefit_type, period_id)
    const { data: upserted, error: upsertErr } = await supabase
      .from('social_benefit_calculations')
      .upsert(items, {
        onConflict: 'company_id,employee_id,period_id,benefit_type',
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

    console.log('✅ Provisions upserted with corrected calculations:', upserted?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'provisions_recorded_with_monthly_base',
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
