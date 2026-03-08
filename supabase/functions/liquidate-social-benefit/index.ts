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

    // 0. VALIDACIÓN DE RE-LIQUIDACIÓN: Verificar si ya existe una liquidación activa para este período
    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from('social_benefit_payments')
      .select('id, period_label, total_amount, employees_count, created_at')
      .eq('company_id', companyId)
      .eq('benefit_type', benefitType)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .eq('anulado', false)
      .maybeSingle();

    if (existingPaymentError) {
      console.error('❌ Error verificando liquidación existente:', existingPaymentError);
    }

    if (existingPayment) {
      console.log(`⚠️ Ya existe liquidación activa para ${benefitType} - ${periodLabel}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'already_liquidated',
          message: 'Esta prestación ya fue liquidada para el período seleccionado',
          existingPayment: {
            id: existingPayment.id,
            periodLabel: existingPayment.period_label,
            amount: existingPayment.total_amount,
            employeesCount: existingPayment.employees_count,
            date: existingPayment.created_at
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        calculated_values,
        employees!inner(nombre, apellido, cedula, salario_base, fecha_ingreso)
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

    // 3. Agrupar por empleado con datos adicionales
    interface EmployeeProvisionExtended extends EmployeeProvision {
      cedula: string;
      base_salary: number;
      fecha_ingreso: string;
      total_days_worked: number;
    }
    
    const employeeMap = new Map<string, EmployeeProvisionExtended>();
    
    for (const p of provisions) {
      const emp = p.employees as any;
      const empName = `${emp.nombre || ''} ${emp.apellido || ''}`.trim() || 'Sin nombre';
      const calcValues = p.calculated_values as any;
      const daysInPeriod = calcValues?.days_count || calcValues?.dias_trabajados || 15; // Default 15 días por quincena
      
      if (!employeeMap.has(p.employee_id)) {
        employeeMap.set(p.employee_id, {
          employee_id: p.employee_id,
          employee_name: empName,
          cedula: emp.cedula || '',
          base_salary: emp.salario_base || 0,
          fecha_ingreso: emp.fecha_ingreso || '',
          periods_count: 0,
          total_amount: 0,
          total_days_worked: 0,
          provision_ids: []
        });
      }
      
      const entry = employeeMap.get(p.employee_id)!;
      entry.periods_count++;
      entry.total_amount += Number(p.amount) || 0;
      entry.total_days_worked += daysInPeriod;
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
            cedula: e.cedula,
            periodsCount: e.periods_count,
            accumulatedAmount: e.total_amount,
            totalDaysWorked: e.total_days_worked,
            baseSalary: e.base_salary,
            fechaIngreso: e.fecha_ingreso
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

    // 6. ACTUALIZAR PAYROLLS CON LOS MONTOS DE PRESTACIONES
    console.log('📝 Actualizando registros de nómina con montos de prestaciones...');

    const fieldMap: Record<string, string> = {
      'prima': 'prima',
      'cesantias': 'cesantias',
      'intereses_cesantias': 'intereses_cesantias',
      'vacaciones': 'vacaciones'
    };

    const updateField = fieldMap[benefitType];
    let payrollsUpdated = 0;

    if (updateField) {
      // Buscar el último período de nómina cerrado dentro del rango de liquidación
      const { data: targetPeriod, error: targetPeriodError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_fin')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .lte('fecha_fin', periodEnd)
        .gte('fecha_inicio', periodStart)
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (targetPeriodError) {
        console.warn('⚠️ Error buscando período objetivo:', targetPeriodError);
      }

      if (targetPeriod) {
        console.log(`   Período objetivo para actualizar payrolls: ${targetPeriod.periodo} (${targetPeriod.id})`);

        for (const emp of employeeList) {
          // Obtener payroll actual para recalcular totales
          const { data: currentPayroll } = await supabase
            .from('payrolls')
            .select('id, total_devengado, neto_pagado')
            .eq('employee_id', emp.employee_id)
            .eq('period_id', targetPeriod.id)
            .maybeSingle();

          if (currentPayroll) {
            const newTotalDevengado = (Number(currentPayroll.total_devengado) || 0) + emp.total_amount;
            const newNetoPagado = (Number(currentPayroll.neto_pagado) || 0) + emp.total_amount;

            const { error: updatePayrollError } = await supabase
              .from('payrolls')
              .update({
                [updateField]: emp.total_amount,
                total_devengado: newTotalDevengado,
                neto_pagado: newNetoPagado,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentPayroll.id);

            if (updatePayrollError) {
              console.warn(`⚠️ No se pudo actualizar payroll para ${emp.employee_name}:`, updatePayrollError);
            } else {
              payrollsUpdated++;
              console.log(`   ✅ Payroll actualizado: ${emp.employee_name} → ${updateField}=$${emp.total_amount.toLocaleString()}, devengado=$${newTotalDevengado.toLocaleString()}, neto=$${newNetoPagado.toLocaleString()}`);
            }
          } else {
            console.warn(`⚠️ No se encontró payroll para ${emp.employee_name} en período ${targetPeriod.periodo}`);
          }
        }

        console.log(`✅ ${payrollsUpdated}/${employeeList.length} payrolls actualizados con ${benefitType}`);
      } else {
        console.warn(`⚠️ No se encontró período de nómina cerrado en el rango ${periodStart} - ${periodEnd}. Los payrolls no fueron actualizados.`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'saved',
        paymentId: payment.id,
        totalAmount,
        employeesCount: totalEmployees,
        provisionsUpdated: allProvisionIds.length,
        payrollsUpdated,
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
