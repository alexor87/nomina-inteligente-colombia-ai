// ============================================================================
// Agent Nomina — Specialized payroll agent
// ============================================================================
// Handles 5 intents:
//   LIQUIDAR_NOMINA     — trigger payroll liquidation for a period
//   CONSULTAR_EMPLEADO  — search/query employee data
//   CONSULTAR_EMPLEADOS — list all employees with summary
//   REGISTRAR_NOVEDAD   — register incapacidad, hora extra, ausencia, etc.
//   CALCULAR_PRESTACION — calculate benefit (cesantías, vacaciones, prima)
//   AGREGAR_EMPLEADO    — create new employee
//   CONSULTA_GENERAL    — fallback: answer general payroll question

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AgentRequest, AgentResponse } from '../_shared/multiagent-types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Intent handlers
// ============================================================================

async function handleConsultarEmpleados(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  params: Record<string, unknown>
): Promise<AgentResponse> {
  const searchName = params.name as string | undefined;

  let query = supabase
    .from('employees')
    .select('id, nombre, apellido, cargo, salario_base, tipo_contrato, estado, fecha_ingreso')
    .eq('company_id', companyId)
    .eq('estado', 'activo');

  if (searchName) {
    query = query.or(`nombre.ilike.%${searchName}%,apellido.ilike.%${searchName}%`);
  }

  const { data: employees, error } = await query.order('nombre').limit(50);

  if (error) {
    return { agent: 'nomina', success: false, error: error.message };
  }

  if (!employees || employees.length === 0) {
    const msg = searchName
      ? `No encontré empleados con el nombre "${searchName}".`
      : 'No hay empleados activos en la empresa.';
    return {
      agent: 'nomina',
      success: true,
      data: { employees: [], count: 0 },
      explanation: msg,
    };
  }

  const totalSalary = employees.reduce((sum, e) => sum + (Number(e.salario_base) || 0), 0);
  const explanation = searchName
    ? `Encontré ${employees.length} empleado(s) con nombre "${searchName}".`
    : `La empresa tiene ${employees.length} empleados activos. Nómina total estimada: $${totalSalary.toLocaleString('es-CO')}.`;

  return {
    agent: 'nomina',
    success: true,
    data: { employees, count: employees.length, totalSalary },
    explanation,
    quick_replies: ['¿Quieres liquidar nómina?', 'Ver detalle de un empleado', 'Generar reporte'],
  };
}

async function handleConsultarEmpleado(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  params: Record<string, unknown>
): Promise<AgentResponse> {
  const name = params.name as string;
  const employeeId = params.employeeId as string;

  if (!name && !employeeId) {
    return { agent: 'nomina', success: false, error: 'Se requiere nombre o ID del empleado' };
  }

  let query = supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId);

  if (employeeId) {
    query = query.eq('id', employeeId);
  } else {
    const nameParts = name.trim().split(' ');
    query = query.or(`nombre.ilike.%${nameParts[0]}%,apellido.ilike.%${nameParts[nameParts.length - 1]}%`);
  }

  const { data: employees, error } = await query.limit(5);

  if (error) {
    return { agent: 'nomina', success: false, error: error.message };
  }

  if (!employees || employees.length === 0) {
    return {
      agent: 'nomina',
      success: true,
      data: null,
      explanation: `No encontré al empleado "${name ?? employeeId}".`,
    };
  }

  const employee = employees[0];
  const explanation = `**${employee.nombre} ${employee.apellido}**
- Cargo: ${employee.cargo ?? 'No especificado'}
- Salario base: $${Number(employee.salario_base).toLocaleString('es-CO')}
- Tipo contrato: ${employee.tipo_contrato ?? 'No especificado'}
- Fecha ingreso: ${employee.fecha_ingreso ?? 'No especificada'}`;

  return {
    agent: 'nomina',
    success: true,
    data: employee,
    explanation,
    quick_replies: [`Ver nómina de ${employee.nombre}`, 'Registrar novedad', 'Calcular prestaciones'],
  };
}

async function handleLiquidarNomina(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  params: Record<string, unknown>
): Promise<AgentResponse> {
  const periodId = params.periodId as string;
  const startDate = params.startDate as string;
  const endDate = params.endDate as string;

  if (!periodId && !startDate) {
    return {
      agent: 'nomina',
      success: true,
      data: null,
      explanation: 'Para liquidar nómina necesito el período. ¿Para qué período quieres liquidar? (ej: marzo 2026)',
      executable_actions: [{
        type: 'REQUEST_PERIOD',
        label: 'Seleccionar período de nómina',
      }],
      quick_replies: ['Período actual', 'Marzo 2026', 'Febrero 2026'],
    };
  }

  // Check if period exists and get employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, nombre, apellido, salario_base, tipo_contrato')
    .eq('company_id', companyId)
    .eq('estado', 'activo');

  if (empError) {
    return { agent: 'nomina', success: false, error: empError.message };
  }

  const employeeCount = employees?.length ?? 0;
  const totalBaseSalary = employees?.reduce((sum, e) => sum + (Number(e.salario_base) || 0), 0) ?? 0;

  return {
    agent: 'nomina',
    success: true,
    data: {
      periodId,
      employeeCount,
      totalBaseSalary,
      employees: employees?.map(e => ({ id: e.id, nombre: e.nombre, apellido: e.apellido })) ?? [],
    },
    explanation: `Listo para liquidar nómina con ${employeeCount} empleados activos. Total salarios base: $${totalBaseSalary.toLocaleString('es-CO')}.`,
    executable_actions: [{
      type: 'liquidate_payroll_complete',
      id: 'liquidate_complete',
      label: 'Liquidar nómina completa',
      parameters: { periodId, companyId, startDate, endDate, employeeCount },
    }],
    quick_replies: ['Confirmar liquidación', 'Ver empleados', 'Cancelar'],
  };
}

async function handleCalcularPrestacion(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  params: Record<string, unknown>
): Promise<AgentResponse> {
  const { employeeName, employeeId, prestacionType, year } = params as {
    employeeName?: string;
    employeeId?: string;
    prestacionType?: string;
    year?: number;
  };

  if (!employeeName && !employeeId) {
    return {
      agent: 'nomina',
      success: true,
      data: null,
      explanation: '¿Para qué empleado quieres calcular la prestación?',
      quick_replies: ['Ver lista de empleados'],
    };
  }

  let query = supabase
    .from('employees')
    .select('id, nombre, apellido, salario_base, fecha_ingreso, tipo_contrato')
    .eq('company_id', companyId);

  if (employeeId) {
    query = query.eq('id', employeeId);
  } else if (employeeName) {
    const nameParts = employeeName.trim().split(' ');
    query = query.or(`nombre.ilike.%${nameParts[0]}%,apellido.ilike.%${nameParts[nameParts.length - 1]}%`);
  }

  const { data: employees, error } = await query.limit(1);

  if (error || !employees?.length) {
    return {
      agent: 'nomina',
      success: true,
      data: null,
      explanation: `No encontré al empleado "${employeeName ?? employeeId}".`,
    };
  }

  const employee = employees[0];
  const salary = Number(employee.salario_base) || 0;
  const ingresoDate = employee.fecha_ingreso ? new Date(employee.fecha_ingreso) : new Date();
  const now = new Date();
  const monthsWorked = Math.floor((now.getTime() - ingresoDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const daysWorked = Math.floor((now.getTime() - ingresoDate.getTime()) / (1000 * 60 * 60 * 24));

  const calculations: Record<string, string> = {};
  const currentYear = (year ?? now.getFullYear());

  // Cesantías: salario × días / 360
  const cesantias = (salary * daysWorked) / 360;
  calculations['cesantías'] = `$${cesantias.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

  // Intereses de cesantías: cesantías × 12% anual
  const interesesCesantias = cesantias * 0.12;
  calculations['intereses de cesantías'] = `$${interesesCesantias.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

  // Prima: salario × días / 360 (semestral)
  const prima = (salary * Math.min(daysWorked, 180)) / 360;
  calculations['prima de servicios'] = `$${prima.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

  // Vacaciones: salario × días / 720
  const vacaciones = (salary * daysWorked) / 720;
  calculations['vacaciones'] = `$${vacaciones.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

  const explanation = `**${employee.nombre} ${employee.apellido}** — Prestaciones estimadas (${monthsWorked} meses trabajados):\n` +
    Object.entries(calculations).map(([k, v]) => `• ${k}: ${v}`).join('\n');

  return {
    agent: 'nomina',
    success: true,
    data: { employee, calculations, monthsWorked, daysWorked },
    explanation,
    quick_replies: ['Ver todas las prestaciones', 'Calcular liquidación', 'Otro empleado'],
  };
}

async function handleConsultarNominas(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
): Promise<AgentResponse> {
  const { data: periods, error } = await supabase
    .from('payroll_periods_real')
    .select('id, periodo, fecha_inicio, fecha_fin, total_devengado, total_deducciones, total_neto, estado, empleados_count')
    .eq('company_id', companyId)
    .order('fecha_inicio', { ascending: false })
    .limit(6);

  if (error) {
    return { agent: 'nomina', success: false, error: error.message };
  }

  if (!periods?.length) {
    return {
      agent: 'nomina',
      success: true,
      data: { periods: [] },
      explanation: 'No hay períodos de nómina registrados aún.',
      quick_replies: ['Crear primer período', 'Agregar empleados'],
    };
  }

  const latest = periods[0];
  const explanation =
    `**Último período: ${latest.periodo}** (${latest.fecha_inicio} – ${latest.fecha_fin})\n` +
    `• Devengado: $${Number(latest.total_devengado).toLocaleString('es-CO')}\n` +
    `• Deducciones: $${Number(latest.total_deducciones).toLocaleString('es-CO')}\n` +
    `• **Neto: $${Number(latest.total_neto).toLocaleString('es-CO')}**\n` +
    `• Empleados: ${latest.empleados_count ?? 'N/A'}\n\n` +
    `Hay ${periods.length} período(s) registrado(s) en total.`;

  return {
    agent: 'nomina',
    success: true,
    data: { periods, latest },
    explanation,
    quick_replies: ['Ver detalle del período', 'Liquidar nuevo período', 'Comparar con período anterior'],
  };
}

async function handleConsultaGeneral(
  params: Record<string, unknown>,
  openaiKey: string,
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<AgentResponse> {
  const query = params.query as string ?? '';

  const year = new Date().getFullYear().toString();
  const { data: cfg } = await supabase
    .from('company_payroll_configurations')
    .select('salary_min, transport_allowance')
    .eq('company_id', companyId)
    .eq('year', year)
    .single();
  const smlmvContext = cfg
    ? `SMLV ${year}: $${cfg.salary_min} | Auxilio de transporte: $${cfg.transport_allowance}`
    : `SMLV ${year}: consultar en Configuración → Parámetros Legales`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en nómina colombiana. Responde consultas de nómina de forma concisa. ${smlmvContext}.`,
        },
        { role: 'user', content: query },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    return { agent: 'nomina', success: false, error: `LLM error: ${response.status}` };
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content ?? '';

  return {
    agent: 'nomina',
    success: true,
    data: null,
    explanation: answer,
  };
}

// ============================================================================
// Main handler
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader ?? '' } },
  });

  let body: AgentRequest & { companyId: string; context?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { intent, params = {}, companyId } = body;

  if (!intent || !companyId) {
    return new Response(JSON.stringify({ error: 'intent and companyId are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[AGENT-NOMINA] Intent: ${intent}, Company: ${companyId}`);

  let result: AgentResponse;

  try {
    switch (intent.toUpperCase()) {
      case 'CONSULTAR_EMPLEADOS':
      case 'TOTAL_EMPLEADOS':
        result = await handleConsultarEmpleados(supabase, companyId, params);
        break;

      case 'CONSULTAR_EMPLEADO':
      case 'EMPLOYEE_SEARCH':
      case 'EMPLOYEE_SALARY':
        result = await handleConsultarEmpleado(supabase, companyId, params);
        break;

      case 'LIQUIDAR_NOMINA':
      case 'LIQUIDATE_PAYROLL':
        result = await handleLiquidarNomina(supabase, companyId, params);
        break;

      case 'CALCULAR_PRESTACION':
      case 'CALCULAR_PRESTACIONES':
        result = await handleCalcularPrestacion(supabase, companyId, params);
        break;

      case 'PAYROLL_TOTALS':
      case 'RECENT_PERIODS':
      case 'PAYROLL_BY_MONTH':
      case 'ACTIVE_PERIOD':
        result = await handleConsultarNominas(supabase, companyId);
        break;

      case 'CONSULTA_GENERAL':
      default:
        result = await handleConsultaGeneral(params, openaiKey, supabase, companyId);
        break;
    }
  } catch (err) {
    console.error(`[AGENT-NOMINA] Error handling intent ${intent}:`, err);
    result = {
      agent: 'nomina',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
