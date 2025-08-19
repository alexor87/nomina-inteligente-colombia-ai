

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
      console.error('❌ Missing period_id in request');
      return new Response(
        JSON.stringify({ success: false, error: 'missing_period_id', message: 'ID de período requerido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📅 Processing provisions for period_id:', period_id);

    // Identify user (for auditing)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized', message: 'No autorizado' }),
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
      console.error('❌ Period not found:', period_id, periodErr);
      return new Response(
        JSON.stringify({ success: false, error: 'period_not_found', message: 'Período no encontrado' }),
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
      console.error('❌ Error loading payrolls:', payrollsErr);
      return new Response(
        JSON.stringify({ success: false, error: 'payrolls_query_error', message: 'Error cargando nóminas del período', details: payrollsErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!payrolls || payrolls.length === 0) {
      console.log('⚠️ No payrolls found for period:', period_id);
      return new Response(
        JSON.stringify({ success: true, message: 'no_payrolls_found', count: 0, details: 'No hay empleados con nómina procesada en este período' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Found payrolls for provisioning:', payrolls.length);

    // Get employee data for full monthly salary
    const employeeIds = [...new Set(payrolls?.map(p => p.employee_id) || [])];
    const { data: employees, error: employeesErr } = await supabase
      .from('employees')
      .select('id, salario_base')
      .in('id', employeeIds);

    if (employeesErr) {
      console.error('❌ Error loading employees:', employeesErr);
      return new Response(
        JSON.stringify({ success: false, error: 'employees_query_error', message: 'Error cargando empleados', details: employeesErr.message }),
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
      
      // ✅ CORREGIDO: Usar salario mensual completo del empleado
      const employee = employeesMap.get(employeeId);
      const salarioMensual = Number(employee?.salario_base) || 0;
      
      // ✅ CORREGIDO: Auxilio de transporte 2025 = $200,000 fijo
      const SMMLV_2025 = 1300000;
      const AUXILIO_TRANSPORTE_2025 = 200000; // Valor fijo legal 2025
      const auxilioMensual = salarioMensual <= (2 * SMMLV_2025) ? AUXILIO_TRANSPORTE_2025 : 0;

      if (!employeeId || workedDays <= 0 || salarioMensual <= 0) {
        console.log('⚠️ Skipping employee with invalid data:', { employeeId, workedDays, salarioMensual });
        continue;
      }

      // ✅ Base constitutiva: salario mensual completo + auxilio mensual completo
      const basePrestaciones = salarioMensual + auxilioMensual;

      // Fórmulas de provisión (proporcionalmente por días trabajados)
      const fraction = workedDays / 360;

      const cesantiasAmount = basePrestaciones * fraction;
      
      // ✅ CORREGIDO: Intereses = 12% de la cesantía del período (Ley 50/1990 Art. 99)
      const interesesAmount = cesantiasAmount * 0.12;
      
      const primaAmount = basePrestaciones * fraction;
      
      // ✅ Vacaciones: solo salario base mensual (sin auxilio transporte) * días / 720
      const vacacionesAmount = salarioMensual * workedDays / 720;

      const calculation_basis = {
        version: "4_legal_2025", // ✅ Nueva versión con cálculo legal
        salario_mensual: salarioMensual,
        auxilio_mensual: auxilioMensual,
        base_prestaciones: basePrestaciones,
        worked_days: workedDays,
        method: 'legal_monthly_base_proportional',
        smmlv_2025: SMMLV_2025,
        auxilio_transporte_2025: AUXILIO_TRANSPORTE_2025, // Valor fijo legal
        legal_reference: "Ley 50/1990 Art. 99 - Intereses 12% anual sobre cesantías",
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
          cesantias: 'base_prestaciones * (dias/360)',
          intereses_cesantias: 'cesantias_amount * 0.12 (Ley 50/1990 Art. 99)',
          prima: 'base_prestaciones * (dias/360)',
          vacaciones: 'salario_mensual * (dias/720) - Solo salario base, sin auxilio',
        },
        calculation_method: 'legal_monthly_base_proportional',
        calculated_at: new Date().toISOString(),
      };

      // ✅ Valores específicos para intereses de cesantías
      const interestCalculatedValues = {
        ...calculated_values,
        rate_applied: 0.12, // 12% anual
        method: "12pct_of_cesantia_period",
        legal_basis: "Ley 50/1990 Art. 99",
        cesantia_del_periodo: Math.round(cesantiasAmount),
        calculation_detail: {
          step1_cesantia: `(${salarioMensual} + ${auxilioMensual}) * ${workedDays} / 360 = ${cesantiasAmount.toFixed(2)}`,
          step2_intereses: `${cesantiasAmount.toFixed(2)} * 0.12 = ${interesesAmount.toFixed(2)}`
        }
      };

      const common = {
        company_id: period.company_id,
        employee_id: employeeId,
        period_start: period.fecha_inicio,
        period_end: period.fecha_fin,
        calculation_basis,
        calculated_values,
        estado: 'calculado',
        notes: 'Provisión automática tras liquidación (Ley 50/1990 Art. 99)',
        created_by: user.id,
      } as Omit<CalculationRow, 'benefit_type' | 'amount'>;

      items.push(
        { ...common, benefit_type: 'cesantias', amount: Math.round(cesantiasAmount) },
        { 
          ...common, 
          benefit_type: 'intereses_cesantias', 
          amount: Math.round(interesesAmount),
          calculated_values: interestCalculatedValues
        },
        { ...common, benefit_type: 'prima', amount: Math.round(primaAmount) },
        { ...common, benefit_type: 'vacaciones', amount: Math.round(vacacionesAmount) },
      );
    }

    console.log('🧾 Calculated provision items:', { count: items.length, employees: employeeIds.length });

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'no_items_to_provision', count: 0, details: 'No hay datos válidos para calcular provisiones' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert avoiding duplicates
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
        JSON.stringify({ success: false, error: 'calculations_upsert_error', message: 'Error guardando cálculos de provisiones', details: upsertErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const finalCount = upserted?.length || 0;
    console.log('✅ Provisions upserted successfully:', finalCount);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'provisions_registered_automatically',
        count: finalCount,
        details: `Se registraron ${finalCount} provisiones automáticamente tras la liquidación`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('❌ provision-social-benefits error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'unexpected', message: 'Error interno del servidor', details: String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
