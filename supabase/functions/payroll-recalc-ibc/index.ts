import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecalculateIBCRequest {
  action: 'recalculate_ibc';
  data: {
    period_id: string;
    company_id: string;
  };
}

// Configuración oficial por año - replicando ConfigurationService
const OFFICIAL_VALUES = {
  2024: { 
    salarioMinimo: 1300000, 
    auxilioTransporte: 162000, 
    uvt: 47065,
    porcentajes: {
      saludEmpleado: 0.04,
      pensionEmpleado: 0.04,
      saludEmpleador: 0.085,
      pensionEmpleador: 0.12
    }
  },
  2025: { 
    salarioMinimo: 1423000, 
    auxilioTransporte: 162000, 
    uvt: 47065,
    porcentajes: {
      saludEmpleado: 0.04,
      pensionEmpleado: 0.04,
      saludEmpleador: 0.085,
      pensionEmpleador: 0.12
    }
  }
};

const calculateWorkedDays = (periodType: string) => {
  switch (periodType) {
    case 'quincenal': return 15;
    case 'semanal': return 7;
    case 'mensual': return 30;
    default: return 30;
  }
};

// Replicando DeductionCalculationService.calculateTransportAllowance
const calculateTransportAllowance = (baseSalary: number, workedDays: number, year: string = '2025') => {
  const yearKey = (year === '2024' || year === '2025') ? year : '2025';
  const config = OFFICIAL_VALUES[yearKey];
  
  const limite2SMMLV = config.salarioMinimo * 2;
  
  if (baseSalary <= limite2SMMLV) {
    return Math.round((config.auxilioTransporte / 30) * workedDays);
  }
  
  return 0;
};

// Obtener novedades constitutivas para un empleado en un período
const getConstitutiveNovedades = async (supabase: any, employeeId: string, periodId: string): Promise<number> => {
  try {
    const { data: novedades, error } = await supabase
      .from('payroll_novedades')
      .select('tipo_novedad, valor')
      .eq('empleado_id', employeeId)
      .eq('periodo_id', periodId);

    if (error) {
      console.error('Error fetching constitutive novedades:', error);
      return 0;
    }

    if (!novedades || novedades.length === 0) {
      return 0;
    }

    // Tipos de novedades constitutivas (que forman parte del IBC)
    const constitutiveTypes = [
      'horas_extra',
      'recargo_nocturno', 
      'comision',
      'prima_extralegal',
      'vacaciones',
      'licencia_remunerada'
    ];

    const constitutiveTotal = novedades
      .filter((novedad: any) => constitutiveTypes.includes(novedad.tipo_novedad))
      .reduce((total: number, novedad: any) => total + (parseFloat(novedad.valor) || 0), 0);

    console.log(`Novedades constitutivas para empleado ${employeeId}: ${constitutiveTotal}`);
    return constitutiveTotal;
  } catch (error) {
    console.error('Error calculating constitutive novedades:', error);
    return 0;
  }
};

// Calcular deducciones usando EXACTAMENTE la misma fórmula que el módulo de liquidación
const calculateDeductions = (salarioBase: number, workedDays: number, constitutiveNovedades: number, year: string = '2025') => {
  const yearKey = (year === '2024' || year === '2025') ? year : '2025';
  const config = OFFICIAL_VALUES[yearKey];
  
  // FÓRMULA EXACTA del módulo de liquidación (línea 302-303 en payroll-calculations)
  const effectiveWorkedDays = Math.min(workedDays, 30);
  const ibcSalud = Math.round((salarioBase / 30) * effectiveWorkedDays + constitutiveNovedades);
  
  // Deducciones sobre IBC (líneas 308-309 en payroll-calculations)
  const saludEmpleado = Math.round(ibcSalud * config.porcentajes.saludEmpleado);
  const pensionEmpleado = Math.round(ibcSalud * config.porcentajes.pensionEmpleado);
  const totalDeducciones = saludEmpleado + pensionEmpleado;
  
  return {
    saludEmpleado,
    pensionEmpleado,
    totalDeducciones,
    ibc: ibcSalud
  };
};

// Función simplificada para obtener totales de novedades (llamada al edge function)
const getNovedadesTotals = async (supabase: any, employeeId: string, periodId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('payroll-calculations', {
      body: {
        action: 'calculate_novedades_totals',
        data: {
          employee_id: employeeId,
          period_id: periodId
        }
      }
    });

    if (error) {
      console.warn(`⚠️ Error getting novedades for employee ${employeeId}:`, error);
      return { totalDevengos: 0, totalDeducciones: 0, totalNeto: 0 };
    }

    return data?.totals || { totalDevengos: 0, totalDeducciones: 0, totalNeto: 0 };
  } catch (error) {
    console.warn(`⚠️ Exception getting novedades for employee ${employeeId}:`, error);
    return { totalDevengos: 0, totalDeducciones: 0, totalNeto: 0 };
  }
};

// Nueva función que replica EXACTAMENTE la lógica de PayrollLiquidationService
const calculatePayrollLiquidationStyle = async (supabase: any, employeeData: any, periodData: any, companyId: string) => {
  const year = new Date(periodData.fecha_inicio).getFullYear().toString();
  const salarioBase = Number(employeeData.salario_base) || 0;
  const diasTrabajados = calculateWorkedDays(periodData.tipo_periodo);
  
  console.log(`🧮 Calculando empleado ${employeeData.nombre} - Salario base: ${salarioBase}, Días: ${diasTrabajados}`);
  
  // FASE 1: Calcular salario proporcional (igual que PayrollLiquidationService línea 128)
  const salarioProporcional = (salarioBase / 30) * diasTrabajados;
  
  // FASE 2: Calcular auxilio de transporte prorrateado (igual que PayrollLiquidationService línea 129)
  const auxilioTransporte = calculateTransportAllowance(salarioBase, diasTrabajados, year);
  
  // FASE 3: Obtener devengos por novedades usando el servicio de cálculo
  const novedadesTotals = await getNovedadesTotals(supabase, employeeData.id, periodData.id);
  
  // FASE 4: Total devengado = salario proporcional + auxilio transporte + devengos novedades
  const totalDevengado = salarioProporcional + auxilioTransporte + novedadesTotals.totalDevengos;
  
  // FASE 5: Obtener novedades constitutivas y calcular deducciones (igual que módulo de liquidación)
  const constitutiveNovedades = await getConstitutiveNovedades(supabase, employeeData.id, periodData.id);
  const deductionResult = calculateDeductions(salarioBase, diasTrabajados, constitutiveNovedades, year);
  
  // FASE 6: Total deducciones = deducciones calculadas + deducciones por novedades
  const totalDeducciones = deductionResult.totalDeducciones + novedadesTotals.totalDeducciones;
  
  // FASE 7: Neto pagado = total devengado - total deducciones
  const netoPagado = totalDevengado - totalDeducciones;
  
  console.log(`✅ ${employeeData.nombre}: Base=${salarioBase}, Días=${diasTrabajados}, Constitutivas=${constitutiveNovedades}, IBC=${deductionResult.ibc}, Salud=${deductionResult.saludEmpleado}, Pensión=${deductionResult.pensionEmpleado}, TotalDed=${totalDeducciones}, Neto=${netoPagado}`);
  
  return {
    totalDevengado,
    totalDeducciones,
    saludEmpleado: deductionResult.saludEmpleado,
    pensionEmpleado: deductionResult.pensionEmpleado,
    ibc: deductionResult.ibc,
    netoPagado,
    auxilioTransporte,
    salarioProporcional
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [PAYROLL-RECALC-IBC] Starting IBC recalculation');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, data } = await req.json() as RecalculateIBCRequest;
    
    if (action !== 'recalculate_ibc') {
      throw new Error('Invalid action');
    }

    const { period_id, company_id } = data;
    console.log(`📊 Processing period ${period_id} for company ${company_id}`);

    // 1. Obtener datos del período
    const { data: periodData, error: periodError } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', period_id)
      .eq('company_id', company_id)
      .single();

    if (periodError) {
      console.error('❌ Error fetching period:', periodError);
      throw periodError;
    }

    console.log(`📅 Period: ${periodData.periodo} (${periodData.tipo_periodo})`);

    // 2. Obtener payrolls del período
    const { data: payrolls, error: payrollsError } = await supabase
      .from('payrolls')
      .select(`
        *, 
        employees!inner(*)
      `)
      .eq('period_id', period_id)
      .eq('company_id', company_id);

    if (payrollsError) {
      console.error('❌ Error fetching payrolls:', payrollsError);
      throw payrollsError;
    }

    console.log(`👥 Found ${payrolls.length} payrolls to recalculate`);

    // 3. Obtener novedades del período
    const { data: novedades, error: novedadesError } = await supabase
      .from('payroll_novedades')
      .select('*')
      .eq('periodo_id', period_id)
      .eq('company_id', company_id);

    if (novedadesError) {
      console.error('❌ Error fetching novedades:', novedadesError);
      throw novedadesError;
    }

    console.log(`📝 Found ${novedades.length} novedades`);

    let updatedCount = 0;
    let totalDevengado = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;

    // 4. Procesar cada payroll con la nueva lógica de PayrollLiquidationService
    for (const payroll of payrolls) {
      console.log(`🔄 Processing ${payroll.employees.nombre} ${payroll.employees.apellido}...`);

      // Usar la nueva función que replica PayrollLiquidationService
      const calculation = await calculatePayrollLiquidationStyle(
        supabase, 
        payroll.employees, 
        periodData, 
        company_id
      );

      // Actualizar payroll con TODOS los campos necesarios
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          total_devengado: calculation.totalDevengado,
          total_deducciones: calculation.totalDeducciones,
          salud_empleado: calculation.saludEmpleado,
          pension_empleado: calculation.pensionEmpleado,
          ibc: calculation.ibc,
          neto_pagado: calculation.netoPagado,
          auxilio_transporte: calculation.auxilioTransporte,
          is_stale: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', payroll.id);

      if (updateError) {
        console.error(`❌ Error updating payroll for employee ${payroll.employee_id}:`, updateError);
        continue;
      }

      updatedCount++;
      totalDevengado += calculation.totalDevengado;
      totalDeducciones += calculation.totalDeducciones;
      totalNeto += calculation.netoPagado;

      console.log(`✅ Updated ${payroll.employees.nombre}: IBC=${calculation.ibc.toFixed(0)}, Deductions=${calculation.totalDeducciones.toFixed(0)}, Net=${calculation.netoPagado.toFixed(0)}`);
    }

    // 5. Actualizar totales del período
    const { error: periodUpdateError } = await supabase
      .from('payroll_periods_real')
      .update({
        empleados_count: updatedCount,
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        total_neto: totalNeto,
        updated_at: new Date().toISOString()
      })
      .eq('id', period_id);

    if (periodUpdateError) {
      console.error('❌ Error updating period totals:', periodUpdateError);
    }

    console.log(`✅ [PAYROLL-RECALC-IBC] Completed successfully:`);
    console.log(`   - Employees processed: ${updatedCount}`);
    console.log(`   - Total devengado: ${totalDevengado.toFixed(0)}`);
    console.log(`   - Total deducciones: ${totalDeducciones.toFixed(0)}`);
    console.log(`   - Total neto: ${totalNeto.toFixed(0)}`);

    return new Response(
      JSON.stringify({
        success: true,
        employees_processed: updatedCount,
        period_id: period_id,
        totals: {
          devengado: totalDevengado,
          deducciones: totalDeducciones,
          neto: totalNeto
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ [PAYROLL-RECALC-IBC] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        period_id: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});