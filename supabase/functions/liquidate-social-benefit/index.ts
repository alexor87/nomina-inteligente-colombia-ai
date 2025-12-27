import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LiquidationRequest {
  companyId: string;
  benefitType: 'cesantias' | 'intereses_cesantias' | 'prima' | 'vacaciones';
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  skipOpenPeriods?: boolean;
  save?: boolean;
}

interface EmployeeProvision {
  employee_id: string;
  employee_name: string;
  periods_count: number;
  total_amount: number;
  provision_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: LiquidationRequest = await req.json();
    const { companyId, benefitType, periodStart, periodEnd, periodLabel, skipOpenPeriods = false, save = false } = body;

    console.log(`📦 Liquidación ${benefitType} - Empresa: ${companyId}, Período: ${periodLabel}`);
    console.log(`   Rango: ${periodStart} a ${periodEnd}, Modo: ${save ? 'GUARDAR' : 'PREVIEW'}`);

    // 1. Detectar períodos abiertos en el rango
    const { data: openPeriods, error: openPeriodsError } = await supabase
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, estado')
      .eq('company_id', companyId)
      .gte('fecha_inicio', periodStart)
      .lte('fecha_fin', periodEnd)
      .neq('estado', 'cerrado')
      .order('fecha_inicio', { ascending: true });

    if (openPeriodsError) {
      console.error('❌ Error consultando períodos abiertos:', openPeriodsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error consultando períodos', details: openPeriodsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasOpenPeriods = openPeriods && openPeriods.length > 0;
    console.log(`   Períodos abiertos: ${hasOpenPeriods ? openPeriods.length : 0}`);

    // Si hay períodos abiertos y no se permite continuar, retornar error
    if (hasOpenPeriods && !skipOpenPeriods && save) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Hay períodos abiertos en el rango de liquidación',
          openPeriods: openPeriods.map(p => ({
            id: p.id,
            periodo: p.periodo,
            fechaInicio: p.fecha_inicio,
            fechaFin: p.fecha_fin,
            estado: p.estado
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Consultar provisiones existentes agrupadas por empleado
    const { data: provisions, error: provisionsError } = await supabase
      .from('social_benefit_calculations')
      .select(`
        id,
        employee_id,
        amount,
        period_start,
        period_end,
        employees!inner(nombre, apellido)
      `)
      .eq('company_id', companyId)
      .eq('benefit_type', benefitType)
      .eq('estado', 'calculado')
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd);

    if (provisionsError) {
      console.error('❌ Error consultando provisiones:', provisionsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error consultando provisiones', details: provisionsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`   Provisiones encontradas: ${provisions?.length || 0}`);

    // Si no hay provisiones, retornar mensaje apropiado
    if (!provisions || provisions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'preview',
          hasOpenPeriods,
          openPeriods: openPeriods?.map(p => ({
            id: p.id,
            periodo: p.periodo,
            fechaInicio: p.fecha_inicio,
            fechaFin: p.fecha_fin,
            estado: p.estado
          })) || [],
          employees: [],
          summary: {
            totalEmployees: 0,
            totalAmount: 0,
            periodsIncluded: 0,
            hasOpenPeriods
          },
          message: 'No hay provisiones calculadas para este período'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Agrupar por empleado
    const employeeMap = new Map<string, EmployeeProvision>();
    
    for (const p of provisions) {
      const emp = p.employees as any;
      const empName = `${emp.nombre || ''} ${emp.apellido || ''}`.trim() || 'Sin nombre';
      
      if (!employeeMap.has(p.employee_id)) {
        employeeMap.set(p.employee_id, {
          employee_id: p.employee_id,
          employee_name: empName,
          periods_count: 0,
          total_amount: 0,
          provision_ids: []
        });
      }
      
      const entry = employeeMap.get(p.employee_id)!;
      entry.periods_count++;
      entry.total_amount += Number(p.amount) || 0;
      entry.provision_ids.push(p.id);
    }

    const employeeList = Array.from(employeeMap.values());
    const totalAmount = employeeList.reduce((sum, e) => sum + e.total_amount, 0);
    const totalEmployees = employeeList.length;
    const allProvisionIds = employeeList.flatMap(e => e.provision_ids);

    console.log(`   Total empleados: ${totalEmployees}, Total monto: $${totalAmount.toLocaleString()}`);

    // Si es solo preview, retornar datos
    if (!save) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'preview',
          hasOpenPeriods,
          openPeriods: openPeriods?.map(p => ({
            id: p.id,
            periodo: p.periodo,
            fechaInicio: p.fecha_inicio,
            fechaFin: p.fecha_fin,
            estado: p.estado
          })) || [],
          employees: employeeList.map(e => ({
            id: e.employee_id,
            name: e.employee_name,
            periodsCount: e.periods_count,
            accumulatedAmount: e.total_amount
          })),
          summary: {
            totalEmployees,
            totalAmount,
            periodsIncluded: provisions.length,
            hasOpenPeriods
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. MODO GUARDAR: Crear registro de pago
    const paymentDetails = {
      employees: employeeList.map(e => ({
        id: e.employee_id,
        name: e.employee_name,
        amount: e.total_amount,
        periodsCount: e.periods_count
      })),
      provisionsCount: allProvisionIds.length,
      skippedOpenPeriods: skipOpenPeriods && hasOpenPeriods
    };

    const { data: payment, error: paymentError } = await supabase
      .from('social_benefit_payments')
      .insert({
        company_id: companyId,
        benefit_type: benefitType,
        period_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        employees_count: totalEmployees,
        total_amount: totalAmount,
        payment_details: paymentDetails,
        created_by: user.id
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Error creando registro de pago:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error creando registro de pago', details: paymentError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`   ✅ Pago creado: ${payment.id}`);

    // 5. Actualizar provisiones a 'liquidado' con referencia al pago
    const { error: updateError } = await supabase
      .from('social_benefit_calculations')
      .update({
        estado: 'liquidado',
        payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .in('id', allProvisionIds);

    if (updateError) {
      console.error('❌ Error actualizando provisiones:', updateError);
      // Intentar eliminar el pago creado para mantener consistencia
      await supabase.from('social_benefit_payments').delete().eq('id', payment.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Error actualizando provisiones', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`   ✅ ${allProvisionIds.length} provisiones marcadas como liquidadas`);

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'saved',
        paymentId: payment.id,
        totalAmount,
        employeesCount: totalEmployees,
        provisionsUpdated: allProvisionIds.length,
        periodLabel
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en liquidate-social-benefit:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
