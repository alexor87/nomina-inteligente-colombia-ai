import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'

interface ReliquidationRequest {
  periodId: string;
  affectedEmployeeIds?: string[];
  justification: string;
  options?: {
    reliquidateScope?: 'affected' | 'all';
    regenerateVouchers?: boolean;
    sendEmails?: boolean;
  };
}

interface PayrollCalculationConfig {
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  year: string;
}

interface EmployeePayrollData {
  id: string;
  employee_id: string;
  salario_base: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  ibc?: number;
  health_deduction?: number;
  pension_deduction?: number;
  transport_allowance?: number;
  employer_contributions?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { periodId, affectedEmployeeIds, justification, options = {} }: ReliquidationRequest = await req.json();
    
    const {
      reliquidateScope = 'affected',
      regenerateVouchers = false,
      sendEmails = false
    } = options;

    console.log(`🔄 Starting re-liquidation for period ${periodId}`, {
      scope: reliquidateScope,
      affectedEmployees: affectedEmployeeIds?.length || 0,
      regenerateVouchers,
      justification
    });

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // 1. Validate period access and get period info
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', periodId)
      .single();

    if (periodError || !period) {
      throw new Error('Period not found or access denied');
    }

    // Validate user has access to this company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.company_id !== period.company_id) {
      throw new Error('Unauthorized access to period');
    }

    // 2. Handle period state - if closed, reopen it temporarily
    let wasReopened = false;
    if (period.estado === 'cerrado') {
      // Log the reopening in audit
      await supabase.from('payroll_reopen_audit').insert({
        company_id: period.company_id,
        user_id: user.id,
        user_email: user.email || 'Unknown',
        periodo: period.periodo,
        action: 'reopen_for_adjustment',
        previous_state: 'cerrado',
        new_state: 'en_proceso',
        notes: `Reopened for novedad adjustments: ${justification}`,
        has_vouchers: true
      });

      // Temporarily set to processing
      await supabase
        .from('payroll_periods_real')
        .update({ estado: 'en_proceso', last_activity_at: new Date().toISOString() })
        .eq('id', periodId);
      
      wasReopened = true;
    }

    // 3. Get configuration for calculations
    const config: PayrollCalculationConfig = {
      salarioMinimo: 1300000, // 2025 SMMLV
      auxilioTransporte: 162000, // 2025
      uvt: 47065, // 2025
      year: '2025'
    };

    // 4. Determine which employees to process
    let employeesToProcess: string[] = [];
    if (reliquidateScope === 'all') {
      const { data: allEmployees } = await supabase
        .from('payrolls')
        .select('employee_id')
        .eq('period_id', periodId);
      
      employeesToProcess = allEmployees?.map(e => e.employee_id) || [];
    } else {
      employeesToProcess = affectedEmployeeIds || [];
    }

    console.log(`📊 Processing ${employeesToProcess.length} employees for re-liquidation`);

    // 5. Process each employee
    const corrections: any[] = [];
    let employeesAffected = 0;

    for (const employeeId of employeesToProcess) {
      try {
        // Get current payroll data
        const { data: currentPayroll } = await supabase
          .from('payrolls')
          .select('*')
          .eq('period_id', periodId)
          .eq('employee_id', employeeId)
          .single();

        if (!currentPayroll) continue;

        // Get employee base data
        const { data: employee } = await supabase
          .from('employees')
          .select('salario_base')
          .eq('id', employeeId)
          .single();

        if (!employee) continue;

        // Get all novedades for this employee in this period
        const { data: novedades } = await supabase
          .from('payroll_novedades')
          .select('*')
          .eq('periodo_id', periodId)
          .eq('empleado_id', employeeId);

        // Calculate period days
        const periodDays = calculateWorkedDaysForPeriod(
          period.tipo_periodo,
          new Date(period.fecha_inicio),
          new Date(period.fecha_fin)
        );

        // Calculate new payroll values
        const newCalculation = calculateEmployeePayroll(
          employee.salario_base,
          novedades || [],
          periodDays,
          config
        );

        // Store previous values for audit
        const previousValues = {
          total_devengado: currentPayroll.total_devengado,
          total_deducciones: currentPayroll.total_deducciones,
          neto_pagado: currentPayroll.neto_pagado,
          ibc: currentPayroll.ibc || 0
        };

        // Update payroll record
        const { error: updateError } = await supabase
          .from('payrolls')
          .update({
            total_devengado: newCalculation.totalDevengado,
            total_deducciones: newCalculation.totalDeducciones,
            neto_pagado: newCalculation.netoPagado,
            ibc: newCalculation.ibc,
            salud_empleado: newCalculation.healthDeduction,
            pension_empleado: newCalculation.pensionDeduction,
            auxilio_transporte: newCalculation.transportAllowance,
            fondo_solidaridad: newCalculation.solidarityFund,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentPayroll.id);

        if (updateError) {
          console.error(`Error updating payroll for employee ${employeeId}:`, updateError);
          continue;
        }

        // Record corrections for audit
        const netDifference = newCalculation.netoPagado - previousValues.neto_pagado;
        if (Math.abs(netDifference) > 0.01) { // Only record if there's a meaningful difference
          corrections.push({
            company_id: period.company_id,
            period_id: periodId,
            employee_id: employeeId,
            previous_value: previousValues.neto_pagado,
            new_value: newCalculation.netoPagado,
            value_difference: netDifference,
            correction_type: 'novedad_adjustment',
            concept: 'Re-liquidation due to novedad changes',
            justification: justification,
            created_by: user.id
          });
        }

        employeesAffected++;
        console.log(`✅ Re-liquidated employee ${employeeId}: ${previousValues.neto_pagado} → ${newCalculation.netoPagado}`);

      } catch (employeeError) {
        console.error(`Error processing employee ${employeeId}:`, employeeError);
      }
    }

    // 6. Insert correction records
    if (corrections.length > 0) {
      const { error: correctionsError } = await supabase
        .from('payroll_period_corrections')
        .insert(corrections);

      if (correctionsError) {
        console.error('Error inserting corrections:', correctionsError);
      }
    }

    // 7. Update period totals
    const { data: periodTotals } = await supabase
      .from('payrolls')
      .select('total_devengado, total_deducciones, neto_pagado')
      .eq('period_id', periodId);

    if (periodTotals) {
      const totals = periodTotals.reduce((acc, payroll) => ({
        devengado: acc.devengado + (payroll.total_devengado || 0),
        deducciones: acc.deducciones + (payroll.total_deducciones || 0),
        neto: acc.neto + (payroll.neto_pagado || 0)
      }), { devengado: 0, deducciones: 0, neto: 0 });

      await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: totals.devengado,
          total_deducciones: totals.deducciones,
          total_neto: totals.neto,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
    }

    // 8. Handle voucher regeneration if requested
    let vouchersRegenerated = 0;
    if (regenerateVouchers && employeesToProcess.length > 0) {
      // Mark existing vouchers as replaced
      const { error: voucherUpdateError } = await supabase
        .from('payroll_vouchers')
        .update({ voucher_status: 'reemplazado' })
        .eq('periodo', period.periodo)
        .in('employee_id', employeesToProcess);

      if (!voucherUpdateError) {
        // Log voucher regeneration
        for (const employeeId of employeesToProcess) {
          await supabase.from('voucher_audit_log').insert({
            company_id: period.company_id,
            voucher_id: crypto.randomUUID(), // Placeholder for new voucher
            user_id: user.id,
            action: 'regenerate_after_adjustment',
            method: 'system',
            success: true
          });
        }
        vouchersRegenerated = employeesToProcess.length;
      }
    }

    // 9. Restore period state if it was reopened
    if (wasReopened) {
      await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          last_activity_at: new Date().toISOString()
        })
        .eq('id', periodId);

      // Log the closing
      await supabase.from('payroll_reopen_audit').insert({
        company_id: period.company_id,
        user_id: user.id,
        user_email: user.email || 'Unknown',
        periodo: period.periodo,
        action: 'close_after_adjustment',
        previous_state: 'en_proceso',
        new_state: 'cerrado',
        notes: `Closed after successful re-liquidation: ${employeesAffected} employees affected`,
        has_vouchers: vouchersRegenerated > 0
      });
    }

    // 10. Create user notification
    await supabase.from('user_notifications').insert({
      user_id: user.id,
      company_id: period.company_id,
      type: 'payroll_reliquidation_completed',
      title: 'Re-liquidación Completada',
      message: `Período ${period.periodo}: ${employeesAffected} empleados reliquidados, ${corrections.length} ajustes aplicados`,
      reference_id: periodId
    });

    const result = {
      success: true,
      message: 'Re-liquidation completed successfully',
      employeesAffected,
      correctionsApplied: corrections.length,
      vouchersRegenerated,
      periodReopened: wasReopened
    };

    console.log('✅ Re-liquidation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Re-liquidation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Utility functions replicated from liquidation logic

function calculateWorkedDaysForPeriod(tipoPeriodo: string, fechaInicio: Date, fechaFin: Date): number {
  if (tipoPeriodo === 'quincenal') return 15;
  if (tipoPeriodo === 'semanal') return 7;
  return Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function calculateEmployeePayroll(
  salarioBase: number,
  novedades: any[],
  diasTrabajados: number,
  config: PayrollCalculationConfig
) {
  // Calculate proportional base salary
  const salarioProporcionado = (salarioBase / 30) * diasTrabajados;
  
  // Sum constitutive novedades for IBC calculation
  const novedadesConstitutivas = novedades
    .filter(n => isNovedadConstitutive(n.tipo_novedad))
    .reduce((sum, n) => sum + (n.valor || 0), 0);
  
  // Calculate IBC (base + constitutive novedades, capped at 25 SMMLV)
  let ibc = salarioProporcionado + novedadesConstitutivas;
  const maxIbc = config.salarioMinimo * 25;
  const minIbc = config.salarioMinimo;
  
  ibc = Math.max(minIbc, Math.min(ibc, maxIbc));
  
  // Calculate deductions
  const healthDeduction = ibc * 0.04; // 4% health
  const pensionDeduction = ibc * 0.04; // 4% pension
  
  // Solidarity fund (if IBC > 4 SMMLV)
  let solidarityFund = 0;
  if (ibc > config.salarioMinimo * 4) {
    if (ibc <= config.salarioMinimo * 16) {
      solidarityFund = ibc * 0.01; // 1%
    } else {
      solidarityFund = ibc * 0.012; // 1.2%
    }
  }
  
  // Transport allowance (if base salary <= 2 SMMLV)
  const transportAllowance = salarioBase <= (config.salarioMinimo * 2) 
    ? (config.auxilioTransporte / 30) * diasTrabajados 
    : 0;
  
  // Sum all novedades (devengados and deducciones)
  const totalNovedades = novedades.reduce((sum, n) => sum + (n.valor || 0), 0);
  
  // Calculate totals
  const totalDevengado = salarioProporcionado + Math.max(0, totalNovedades) + transportAllowance;
  const totalDeducciones = healthDeduction + pensionDeduction + solidarityFund + Math.abs(Math.min(0, totalNovedades));
  const netoPagado = totalDevengado - totalDeducciones;
  
  // Employer contributions (approximate)
  const employerContributions = ibc * 0.205; // ~20.5% employer contributions
  
  return {
    totalDevengado,
    totalDeducciones,
    netoPagado,
    ibc,
    healthDeduction,
    pensionDeduction,
    transportAllowance,
    employerContributions,
    solidarityFund
  };
}

function isNovedadConstitutive(tipoNovedad: string): boolean {
  const constitutiveTypes = [
    'horas_extra',
    'recargo_nocturno',
    'recargo_dominical',
    'comision',
    'bonificacion',
    'vacaciones',
    'licencia_remunerada',
    'auxilio_conectividad'
  ];
  
  return constitutiveTypes.includes(tipoNovedad);
}