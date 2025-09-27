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

// Configuración oficial por año
const OFFICIAL_VALUES = {
  2024: { salarioMinimo: 1300000, auxilioTransporte: 162000, uvt: 47065 },
  2025: { salarioMinimo: 1423000, auxilioTransporte: 162000, uvt: 47065 }
};

const getTransportAssistanceLimit = (year: string = '2025') => {
  const yearKey = (year === '2024' || year === '2025') ? year : '2025';
  const { salarioMinimo } = OFFICIAL_VALUES[yearKey];
  return salarioMinimo * 2;
};

const calculateWorkedDays = (periodType: string) => {
  switch (periodType) {
    case 'quincenal': return 15;
    case 'semanal': return 7;
    case 'mensual': return 30;
    default: return 30;
  }
};

const convertNovedadesToIBC = (novedades: any[]) => {
  return novedades.map(novedad => {
    let constitutivo = false;
    
    // Lógica de constitutividad igual a otras funciones
    const tipo = novedad.tipo_novedad?.toLowerCase();
    switch (tipo) {
      case 'horas_extra':
      case 'recargos':
      case 'comisiones':
      case 'bonificaciones':
      case 'primas':
        constitutivo = true;
        break;
      case 'incapacidad':
      case 'vacaciones':
      case 'ausencia':
      case 'licencia_no_remunerada':
        constitutivo = false;
        break;
      default:
        constitutivo = novedad.constitutivo_salario === true;
    }

    return {
      valor: Number(novedad.valor) || 0,
      constitutivo_salario: constitutivo,
      tipo_novedad: novedad.tipo_novedad,
      dias: novedad.dias,
      subtipo: novedad.subtipo === 'general' || novedad.subtipo === 'laboral' 
        ? novedad.subtipo 
        : (novedad.subtipo?.includes('general') || novedad.subtipo?.includes('General') ? 'general' : 'laboral')
    };
  });
};

const isNovedadConstitutiva = (tipoNovedad: string, valorExplicito?: boolean) => {
  if (valorExplicito !== undefined) return valorExplicito;
  
  const tipo = tipoNovedad?.toLowerCase();
  switch (tipo) {
    case 'horas_extra':
    case 'recargos':
    case 'comisiones':
    case 'bonificaciones':
    case 'primas':
      return true;
    default:
      return false;
  }
};

const getCompanyPolicy = async (supabase: any, companyId: string) => {
  // Mock policy - en producción vendría de la DB
  return {
    incapacidad_general_percentage: 66.67,
    incapacidad_laboral_percentage: 100,
    dias_carencia_incapacidad: 2
  };
};

const calculatePayroll = async (supabase: any, employeeData: any, periodData: any, novedades: any[], companyId: string) => {
  const year = new Date(periodData.fecha_inicio).getFullYear().toString();
  const yearKey = (year === '2024' || year === '2025') ? year : '2025';
  const officialValues = OFFICIAL_VALUES[yearKey];
  const transportLimit = getTransportAssistanceLimit(year);
  
  const salarioBase = Number(employeeData.salario_base) || 0;
  const workedDays = calculateWorkedDays(periodData.tipo_periodo);
  const proportionalFactor = workedDays / 30;
  
  // Auxilio de transporte prorrateado
  const auxTransp = salarioBase <= transportLimit ? (officialValues.auxilioTransporte * proportionalFactor) : 0;
  
  // Calcular IBC
  let ibcConstitutivo = salarioBase;
  let ibcIncapacidades = 0;
  
  for (const novedad of novedades) {
    if (isNovedadConstitutiva(novedad.tipo_novedad, novedad.constitutivo_salario)) {
      ibcConstitutivo += Number(novedad.valor) || 0;
    }
    
    if (novedad.tipo_novedad === 'incapacidad') {
      ibcIncapacidades += Number(novedad.valor) || 0;
    }
  }
  
  const ibcProporcional = ibcConstitutivo * proportionalFactor;
  const ibc = Math.max(ibcProporcional - Math.abs(ibcIncapacidades), officialValues.salarioMinimo * proportionalFactor);
  
  // Calcular deducciones
  const healthDeduction = ibc * 0.04;
  const pensionDeduction = ibc * 0.04;
  const totalDeductions = healthDeduction + pensionDeduction;
  
  // Calcular devengos totales
  let totalDevengos = salarioBase + auxTransp;
  for (const novedad of novedades) {
    if (Number(novedad.valor) > 0) {
      totalDevengos += Number(novedad.valor);
    }
  }
  
  // Calcular descuentos adicionales (novedades negativas)
  let descuentos = 0;
  for (const novedad of novedades) {
    if (Number(novedad.valor) < 0) {
      descuentos += Math.abs(Number(novedad.valor));
    }
  }
  
  const netPay = totalDevengos - totalDeductions - descuentos;
  
  return {
    totalDevengos,
    totalDeductions,
    healthDeduction,
    pensionDeduction,
    ibc,
    netPay,
    auxTransp
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

    // Agrupar novedades por empleado
    const novedadesByEmployee = novedades.reduce((acc, novedad) => {
      const empId = novedad.empleado_id;
      if (!acc[empId]) acc[empId] = [];
      acc[empId].push(novedad);
      return acc;
    }, {} as Record<string, any[]>);

    let updatedCount = 0;
    let totalDevengado = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;

    // 4. Procesar cada payroll
    for (const payroll of payrolls) {
      const employeeNovedades = novedadesByEmployee[payroll.employee_id] || [];
      const convertedNovedades = convertNovedadesToIBC(employeeNovedades);
      
      console.log(`🔄 Processing ${payroll.employees.nombre} ${payroll.employees.apellido}...`);

      // Calcular con la misma lógica que otras funciones
      const calculation = await calculatePayroll(
        supabase, 
        payroll.employees, 
        periodData, 
        convertedNovedades, 
        company_id
      );

      // Actualizar payroll con TODOS los campos
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          total_devengado: calculation.totalDevengos,
          total_deducciones: calculation.totalDeductions,
          salud_empleado: calculation.healthDeduction,
          pension_empleado: calculation.pensionDeduction,
          ibc: calculation.ibc,
          neto_pagado: calculation.netPay,
          auxilio_transporte: calculation.auxTransp,
          is_stale: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', payroll.id);

      if (updateError) {
        console.error(`❌ Error updating payroll for employee ${payroll.employee_id}:`, updateError);
        continue;
      }

      updatedCount++;
      totalDevengado += calculation.totalDevengos;
      totalDeducciones += calculation.totalDeductions;
      totalNeto += calculation.netPay;

      console.log(`✅ Updated ${payroll.employees.nombre}: IBC=${calculation.ibc.toFixed(0)}, Deductions=${calculation.totalDeductions.toFixed(0)}, Net=${calculation.netPay.toFixed(0)}`);
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