
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// PARÁMETROS LEGALES 2025 (Decreto 2613/2024)
// ============================================================================
const SMMLV_2025 = 1423500;
const AUXILIO_TRANSPORTE_2025 = 200000;
const TOPE_AUXILIO_2025 = SMMLV_2025 * 2; // 2,847,000

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

interface PayrollRecord {
  salario_base: number;
  dias_trabajados: number;
  auxilio_transporte: number;
  comisiones: number;
  bonificaciones: number;
  horas_extra: number;
  horas_extra_diurnas: number;
  horas_extra_nocturnas: number;
  recargo_nocturno: number;
  recargo_dominical: number;
  period_id: string;
  payroll_periods_real?: {
    fecha_inicio: string;
    fecha_fin: string;
  };
}

interface PayrollHistoryResult {
  payrolls: PayrollRecord[];
  totalDays: number;
  promedioMensual: number;
  promedioSinExtras: number;
  conceptosIncluidos: {
    salario_base: number;
    comisiones: number;
    bonificaciones: number;
    horas_extra: number;
    recargos: number;
  };
  tieneVariables: boolean;
}

// ============================================================================
// HELPER: Obtener historial de nóminas según período requerido
// ============================================================================
async function getPayrollHistory(
  supabase: SupabaseClient,
  employeeId: string,
  referenceDate: Date,
  periodType: 'ultimo_ano' | 'semestre' | '12_meses_calendario',
  companyId: string
): Promise<PayrollHistoryResult> {
  let startDate: Date;
  const endDate = new Date(referenceDate);
  
  switch (periodType) {
    case 'ultimo_ano':
      // Art. 253 CST: Último año de SERVICIOS
      startDate = new Date(referenceDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
      
    case 'semestre':
      // Prima: 1er semestre (ene-jun) o 2do semestre (jul-dic)
      const month = referenceDate.getMonth();
      startDate = new Date(referenceDate.getFullYear(), month < 6 ? 0 : 6, 1);
      break;
      
    case '12_meses_calendario':
      // Vacaciones: 12 meses calendario literales
      startDate = new Date(referenceDate);
      startDate.setMonth(startDate.getMonth() - 12);
      break;
  }

  console.log(`📊 getPayrollHistory [${periodType}]:`, {
    employeeId,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  });

  // Consultar payrolls con todos los conceptos constitutivos
  const { data: payrolls, error } = await supabase
    .from('payrolls')
    .select(`
      salario_base, 
      dias_trabajados,
      auxilio_transporte,
      comisiones,
      bonificaciones,
      horas_extra,
      horas_extra_diurnas,
      horas_extra_nocturnas,
      recargo_nocturno,
      recargo_dominical,
      period_id,
      payroll_periods_real!inner(fecha_inicio, fecha_fin)
    `)
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .gte('payroll_periods_real.fecha_fin', startDate.toISOString().slice(0, 10))
    .lte('payroll_periods_real.fecha_fin', endDate.toISOString().slice(0, 10));

  if (error) {
    console.error('❌ Error fetching payroll history:', error);
    return {
      payrolls: [],
      totalDays: 0,
      promedioMensual: 0,
      promedioSinExtras: 0,
      conceptosIncluidos: { salario_base: 0, comisiones: 0, bonificaciones: 0, horas_extra: 0, recargos: 0 },
      tieneVariables: false
    };
  }

  const records = payrolls || [];
  
  // Calcular totales
  let totalDias = 0;
  let totalSalario = 0;
  let totalComisiones = 0;
  let totalBonificaciones = 0;
  let totalHorasExtra = 0;
  let totalRecargos = 0;

  for (const p of records) {
    const dias = Number(p.dias_trabajados) || 0;
    totalDias += dias;
    totalSalario += Number(p.salario_base) || 0;
    totalComisiones += Number(p.comisiones) || 0;
    totalBonificaciones += Number(p.bonificaciones) || 0;
    totalHorasExtra += (Number(p.horas_extra) || 0) + 
                       (Number(p.horas_extra_diurnas) || 0) + 
                       (Number(p.horas_extra_nocturnas) || 0);
    totalRecargos += (Number(p.recargo_nocturno) || 0) + (Number(p.recargo_dominical) || 0);
  }

  const cantidadPeriodos = records.length || 1;
  
  // Promedio mensual completo (para cesantías y prima)
  const promedioTotal = (totalSalario + totalComisiones + totalBonificaciones + totalHorasExtra + totalRecargos) / cantidadPeriodos;
  
  // Promedio sin horas extra ni dominicales (para vacaciones)
  // Solo incluye recargo nocturno ordinario, NO recargo dominical
  const promedioSinExtras = (totalSalario + totalComisiones + totalBonificaciones + (totalRecargos / 2)) / cantidadPeriodos;

  const tieneVariables = totalComisiones > 0 || totalBonificaciones > 0;

  console.log(`📈 Historial calculado [${periodType}]:`, {
    periodos: cantidadPeriodos,
    totalDias,
    promedioTotal,
    promedioSinExtras,
    tieneVariables
  });

  return {
    payrolls: records as PayrollRecord[],
    totalDays: totalDias,
    promedioMensual: promedioTotal,
    promedioSinExtras,
    conceptosIncluidos: {
      salario_base: totalSalario / cantidadPeriodos,
      comisiones: totalComisiones / cantidadPeriodos,
      bonificaciones: totalBonificaciones / cantidadPeriodos,
      horas_extra: totalHorasExtra / cantidadPeriodos,
      recargos: totalRecargos / cantidadPeriodos
    },
    tieneVariables
  };
}

// ============================================================================
// HELPER: Detectar variación salarial en últimos 3 meses
// ============================================================================
async function detectarVariacionSalarial(
  supabase: SupabaseClient,
  employeeId: string,
  companyId: string
): Promise<{ tieneVariables: boolean; huboVariacion: boolean; salarios: number[] }> {
  const { data: recentPayrolls } = await supabase
    .from('payrolls')
    .select('salario_base, comisiones, bonificaciones')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(6); // 6 quincenas = 3 meses

  if (!recentPayrolls || recentPayrolls.length === 0) {
    return { tieneVariables: false, huboVariacion: false, salarios: [] };
  }

  const tieneVariables = recentPayrolls.some(p => 
    (Number(p.comisiones) || 0) > 0 || 
    (Number(p.bonificaciones) || 0) > 0
  );

  const salarios = recentPayrolls.map(p => Number(p.salario_base) || 0);
  const primerSalario = salarios[0];
  const huboVariacion = salarios.some(s => s !== primerSalario);

  return { tieneVariables, huboVariacion, salarios };
}

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

    // ✅ MEJORADO: Obtener payrolls con todos los conceptos constitutivos
    const { data: payrolls, error: payrollsErr } = await supabase
      .from('payrolls')
      .select(`
        employee_id, 
        salario_base, 
        dias_trabajados, 
        auxilio_transporte,
        comisiones,
        bonificaciones,
        horas_extra,
        horas_extra_diurnas,
        horas_extra_nocturnas,
        recargo_nocturno,
        recargo_dominical
      `)
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

    // Get employee data for full monthly salary + fecha_ingreso para validación
    const employeeIds = [...new Set(payrolls?.map(p => p.employee_id) || [])];
    const { data: employees, error: employeesErr } = await supabase
      .from('employees')
      .select('id, salario_base, fecha_ingreso')
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
    let skippedDueToHireDate = 0;

    const periodEndDate = new Date(period.fecha_fin);
    const esPrimerSemestre = periodEndDate.getMonth() < 6;

    for (const p of payrolls || []) {
      const employeeId = p.employee_id as string;
      const workedDays = Number(p.dias_trabajados) || 0;
      
      // Usar salario mensual completo del empleado
      const employee = employeesMap.get(employeeId);
      const salarioMensual = Number(employee?.salario_base) || 0;
      const fechaIngreso = employee?.fecha_ingreso;
      
      // VALIDACIÓN: Verificar que el período no sea anterior a la fecha de ingreso
      if (fechaIngreso) {
        const hireDate = new Date(fechaIngreso);
        const periodEnd = new Date(period.fecha_fin);
        if (periodEnd < hireDate) {
          console.log('⚠️ Skipping employee - period ends before hire date:', {
            employeeId,
            fechaIngreso,
            periodEnd: period.fecha_fin
          });
          skippedDueToHireDate++;
          continue;
        }
      }

      if (!employeeId || workedDays <= 0 || salarioMensual <= 0) {
        console.log('⚠️ Skipping employee with invalid data:', { employeeId, workedDays, salarioMensual });
        continue;
      }

      // ============================================================================
      // DETECTAR SALARIO VARIABLE O VARIACIÓN (Art. 253 CST)
      // ============================================================================
      const variacionInfo = await detectarVariacionSalarial(supabase, employeeId, period.company_id);
      const usarPromedio = variacionInfo.tieneVariables || variacionInfo.huboVariacion;

      // Ingresos constitutivos del período actual
      const comisionesPeriodo = Number(p.comisiones) || 0;
      const bonificacionesPeriodo = Number(p.bonificaciones) || 0;
      const horasExtraPeriodo = (Number(p.horas_extra) || 0) + 
                                 (Number(p.horas_extra_diurnas) || 0) + 
                                 (Number(p.horas_extra_nocturnas) || 0);
      const recargosPeriodo = (Number(p.recargo_nocturno) || 0) + (Number(p.recargo_dominical) || 0);

      // Auxilio de transporte mensual
      const auxilioMensual = salarioMensual <= TOPE_AUXILIO_2025 ? AUXILIO_TRANSPORTE_2025 : 0;

      // ============================================================================
      // CÁLCULO DE CESANTÍAS (Art. 253 CST)
      // Si variable o variación: promedio del ÚLTIMO AÑO de servicios
      // Si fijo sin variación: último salario
      // ============================================================================
      let baseCesantias: number;
      let cesantiasHistorial: PayrollHistoryResult | null = null;

      if (usarPromedio) {
        cesantiasHistorial = await getPayrollHistory(
          supabase, employeeId, periodEndDate, 'ultimo_ano', period.company_id
        );
        baseCesantias = cesantiasHistorial.promedioMensual + auxilioMensual;
        console.log(`📊 Cesantías [VARIABLE]: Usando promedio último año para ${employeeId}:`, baseCesantias);
      } else {
        baseCesantias = salarioMensual + auxilioMensual + comisionesPeriodo + bonificacionesPeriodo + horasExtraPeriodo + recargosPeriodo;
        console.log(`📊 Cesantías [FIJO]: Usando salario actual para ${employeeId}:`, baseCesantias);
      }

      const cesantiasAmount = (baseCesantias * workedDays) / 360;
      const interesesAmount = cesantiasAmount * 0.12;

      // ============================================================================
      // CÁLCULO DE PRIMA (Art. 306 CST)
      // Promedio del SEMESTRE respectivo
      // ============================================================================
      const primaHistorial = await getPayrollHistory(
        supabase, employeeId, periodEndDate, 'semestre', period.company_id
      );
      
      let basePrima: number;
      if (primaHistorial.tieneVariables || primaHistorial.payrolls.length > 1) {
        basePrima = primaHistorial.promedioMensual + auxilioMensual;
        console.log(`📊 Prima [PROMEDIO SEMESTRE]: ${employeeId}:`, basePrima);
      } else {
        basePrima = salarioMensual + auxilioMensual + comisionesPeriodo + bonificacionesPeriodo + horasExtraPeriodo + recargosPeriodo;
      }

      const primaAmount = (basePrima * workedDays) / 360;

      // ============================================================================
      // CÁLCULO DE VACACIONES (Art. 192 CST)
      // - Si variable: promedio 12 meses CALENDARIO
      // - EXCLUIR: horas extra y trabajo dominical/festivo
      // - SIN auxilio de transporte
      // ============================================================================
      let baseVacaciones: number;
      let vacacionesHistorial: PayrollHistoryResult | null = null;

      if (variacionInfo.tieneVariables) {
        vacacionesHistorial = await getPayrollHistory(
          supabase, employeeId, periodEndDate, '12_meses_calendario', period.company_id
        );
        // Usar promedio SIN horas extra ni dominicales
        baseVacaciones = vacacionesHistorial.promedioSinExtras;
        console.log(`📊 Vacaciones [VARIABLE 12M]: ${employeeId}:`, baseVacaciones);
      } else {
        // Solo salario base (sin extras ni dominicales, sin auxilio)
        baseVacaciones = salarioMensual;
        console.log(`📊 Vacaciones [FIJO]: ${employeeId}:`, baseVacaciones);
      }

      const vacacionesAmount = (baseVacaciones * workedDays) / 720;

      // ============================================================================
      // AUDITORÍA: calculation_basis con toda la información
      // ============================================================================
      const calculation_basis = {
        version: "5_variable_salary_2025",
        
        // Tipo de salario detectado
        tipo_salario: usarPromedio ? 'variable_o_variacion' : 'fijo',
        tiene_comisiones: variacionInfo.tieneVariables,
        hubo_variacion_3_meses: variacionInfo.huboVariacion,
        
        // Datos del período actual
        periodo_actual: {
          salario_mensual: salarioMensual,
          auxilio_mensual: auxilioMensual,
          comisiones: comisionesPeriodo,
          bonificaciones: bonificacionesPeriodo,
          horas_extra: horasExtraPeriodo,
          recargos: recargosPeriodo,
          worked_days: workedDays
        },
        
        // Bases calculadas por prestación
        bases_calculadas: {
          cesantias: {
            base: baseCesantias,
            metodo: usarPromedio ? 'promedio_ultimo_ano' : 'salario_actual',
            periodos_promediados: cesantiasHistorial?.payrolls.length || 1,
            conceptos: cesantiasHistorial?.conceptosIncluidos || null
          },
          prima: {
            base: basePrima,
            metodo: 'promedio_semestre',
            semestre: esPrimerSemestre ? 1 : 2,
            periodos_promediados: primaHistorial.payrolls.length
          },
          vacaciones: {
            base: baseVacaciones,
            metodo: variacionInfo.tieneVariables ? 'promedio_12_meses_calendario' : 'salario_actual',
            sin_horas_extra: true,
            sin_auxilio_transporte: true,
            periodos_promediados: vacacionesHistorial?.payrolls.length || 1
          }
        },
        
        // Parámetros legales 2025
        parametros_2025: {
          smmlv: SMMLV_2025,
          auxilio_transporte: AUXILIO_TRANSPORTE_2025,
          tope_auxilio: TOPE_AUXILIO_2025
        },
        
        // Referencias legales
        legal_references: {
          cesantias: "Art. 253 CST - Si variable o variación: promedio último año de servicios",
          intereses: "Ley 50/1990 Art. 99 - 12% anual sobre cesantías",
          prima: "Art. 306 CST - Promedio del semestre respectivo",
          vacaciones: "Art. 192 CST num. 2 - Promedio 12 meses calendario, sin HE ni dominicales"
        },
        
        // Metadata
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
          cesantias: `base_cesantias(${baseCesantias}) * (${workedDays}/360) = ${cesantiasAmount.toFixed(2)}`,
          intereses_cesantias: `cesantias(${cesantiasAmount.toFixed(2)}) * 0.12 = ${interesesAmount.toFixed(2)}`,
          prima: `base_prima(${basePrima}) * (${workedDays}/360) = ${primaAmount.toFixed(2)}`,
          vacaciones: `base_vacaciones(${baseVacaciones}) * (${workedDays}/720) = ${vacacionesAmount.toFixed(2)}`,
        },
        calculation_method: 'legal_variable_salary_2025',
        calculated_at: new Date().toISOString(),
      };

      const interestCalculatedValues = {
        ...calculated_values,
        rate_applied: 0.12,
        method: "12pct_of_cesantia_period",
        legal_basis: "Ley 50/1990 Art. 99",
        cesantia_del_periodo: Math.round(cesantiasAmount),
      };

      const common = {
        company_id: period.company_id,
        employee_id: employeeId,
        period_start: period.fecha_inicio,
        period_end: period.fecha_fin,
        calculation_basis,
        calculated_values,
        estado: 'calculado',
        notes: 'Provisión automática v5 - Salario variable (Art. 253, 306, 192 CST)',
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

    console.log('🧾 Calculated provision items:', { 
      count: items.length, 
      employees: employeeIds.length,
      skippedDueToHireDate 
    });

    if (items.length === 0) {
      const message = skippedDueToHireDate > 0 
        ? `No hay datos válidos para calcular provisiones. ${skippedDueToHireDate} empleados omitidos por fecha de ingreso posterior al período.`
        : 'No hay datos válidos para calcular provisiones';
      return new Response(
        JSON.stringify({ success: true, message: 'no_items_to_provision', count: 0, skippedDueToHireDate, details: message }),
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
        details: `Se registraron ${finalCount} provisiones automáticamente con cálculo de salario variable (v5)`,
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
