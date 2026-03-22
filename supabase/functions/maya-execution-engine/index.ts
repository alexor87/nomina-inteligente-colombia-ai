// ============================================================================
// Maya Execution Engine v2.1 — Cost-Aware Routing + DAG Runner
// ============================================================================
// Flow:
//   1. CostAwareRouter evaluates query with SimpleIntentMatcher (pure regex)
//   2a. KISS Path (confidence ≥ threshold): direct Supabase query + cache → $0
//   2b. DAG Path (confidence < threshold):
//       a. Plan Generator (GPT-4o) → ExecutionPlan
//       b. validateDAG() — cycle detection
//       c. Execute phases: parallel (Promise.all) or sequential w/ upstream_results
//       d. Consolidator (GPT-4o) → unified response
//   3. Record routing telemetry in agent_execution_plans

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CostAwareRouter } from './cost-aware-router.ts';
import { TokenBudgetService } from '../_shared/token-budget-service.ts';
import type {
  AgentType,
  AgentInvocation,
  AgentResponse,
  ExecutionPlan,
  ExecutionPhase,
  UpstreamResult,
  EngineRequest,
  EngineResponse,
  RoutingDecision,
} from '../_shared/multiagent-types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// KISS Path — Direct Supabase queries for simple intents
// ============================================================================

async function getPayrollConfig(
  _supabase: ReturnType<typeof createClient>,
  companyId: string,
  year = new Date().getFullYear().toString()
): Promise<{ salary_min: number; transport_allowance: number; uvt: number } | null> {
  // Use a service-role-only client to bypass RLS for config lookup
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  const { data } = await adminClient
    .from('company_payroll_configurations')
    .select('salary_min, transport_allowance, uvt')
    .eq('company_id', companyId)
    .eq('year', year)
    .single();
  return data ?? null;
}

// ── kiss_legal_fallback ──────────────────────────────────────────────────────
// Invokes agent-legal using a shared cache key (no company_id).
// The legal decree is the same for all companies — cache is global.
async function executeKissLegalFallback(
  routing: RoutingDecision,
  query: string,
  companyId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
  router: CostAwareRouter,
): Promise<EngineResponse> {
  const hint      = routing.fallback_hint;
  const intent    = routing.matched_intent ?? 'SMLMV_VALUE';
  const year      = routing.kiss_params?.year ?? new Date().getFullYear();
  const cacheKey  = router.buildLegalCacheKey(intent, String(year));

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Check shared legal cache
  const { data: cached } = await adminClient
    .from('maya_kiss_cache')
    .select('response')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached?.response) {
    console.log(`[ENGINE] Legal cache HIT — ${cacheKey}`);
    return { ...(cached.response as EngineResponse), routing: { ...routing, from_cache: true } };
  }

  // 2. Cache miss — invoke agent-legal
  console.log(`[ENGINE] Legal cache MISS — invoking agent-legal for ${cacheKey}`);
  try {
    const agentReq = {
      plan_id:              crypto.randomUUID(),
      invocation_id:        crypto.randomUUID(),
      company_id:           companyId,
      user_id:              '',
      session_id:           '',
      query,
      intent,
      params:               { year, legal_query: hint?.legal_query },
      upstream_results:     [],
      conversation_history: [],
      max_tokens:           512,
      timeout_ms:           4000,
    };

    const legalRes = await fetch(`${supabaseUrl}/functions/v1/agent-legal`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(agentReq),
    });

    const agentResp = await legalRes.json();
    const message   = agentResp.explanation ?? agentResp.summary ?? 'No se encontró el valor solicitado.';
    const found     = agentResp.data?.found === true;

    const engineResponse: EngineResponse = {
      message,
      quickReplies: found ? ['Configurar en parámetros legales'] : [],
      routing:      { ...routing, from_cache: false },
    };

    // 3. Store in shared legal cache (no company_id key)
    if (found) {
      const ttl = hint?.legal_cache_ttl ?? 86400;
      await adminClient.from('maya_kiss_cache').upsert({
        company_id: companyId,   // required FK, but key has no company_id
        cache_key:  cacheKey,
        intent,
        response:   engineResponse,
        ttl_seconds: ttl,
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      }, { onConflict: 'company_id,cache_key' }).catch(console.warn);
    }

    return engineResponse;
  } catch (err) {
    console.error('[ENGINE] agent-legal invocation failed:', err);
    return {
      message:      'No pude consultar la fuente legal en este momento. Intenta de nuevo en unos segundos.',
      quickReplies: [],
      routing,
    };
  }
}

async function executeKissIntent(
  intent: string,
  params: Record<string, unknown>,
  companyId: string,
  supabase: ReturnType<typeof createClient>
): Promise<EngineResponse> {
  switch (intent) {
    case 'EMPLOYEE_LIST':
    case 'EMPLOYEE_COUNT': {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cargo, salario_base, estado')
        .eq('company_id', companyId)
        .eq('estado', 'activo')
        .order('nombre')
        .limit(100);

      if (error) throw new Error(error.message);
      const count = employees?.length ?? 0;
      const total = employees?.reduce((s: number, e: any) => s + (Number(e.salario_base) || 0), 0) ?? 0;

      return {
        message: `Tienes **${count} empleados activos**. Nómina total estimada: **$${total.toLocaleString('es-CO')}**.`,
        quickReplies: ['Ver detalle por empleado', 'Liquidar nómina', 'Generar reporte'],
        emotionalState: 'thoughtful',
      };
    }

    case 'PAYROLL_TOTALS':
    case 'RECENT_PERIODS': {
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin, total_devengado, total_deducciones, total_neto, estado, empleados_count')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false })
        .limit(6);

      if (error) throw new Error(error.message);
      const latest = periods?.[0];
      const msg = latest
        ? `Último período: **${latest.periodo}** (${latest.fecha_inicio} – ${latest.fecha_fin}) — Devengado: **$${Number(latest.total_devengado).toLocaleString('es-CO')}** | Neto: **$${Number(latest.total_neto).toLocaleString('es-CO')}**`
        : 'No encontré períodos de nómina registrados.';

      return {
        message: msg,
        quickReplies: ['Ver todos los períodos', 'Liquidar período actual'],
        emotionalState: 'thoughtful',
      };
    }

    case 'SMLMV_VALUE': {
      const year = (params.year as number ?? new Date().getFullYear()).toString();
      const cfg = await getPayrollConfig(supabase, companyId, year);
      if (!cfg) {
        return {
          message: `No encontré la configuración de nómina para el año ${year}. Verifica los parámetros legales en Configuración.`,
          quickReplies: ['Ir a Configuración', 'Ver parámetros legales'],
          emotionalState: 'thoughtful',
        };
      }
      const smlmv = Number(cfg.salary_min).toLocaleString('es-CO');
      const auxilio = Number(cfg.transport_allowance).toLocaleString('es-CO');
      return {
        message: `**SMLMV ${year}:** $${smlmv} | **Auxilio de transporte:** $${auxilio} (aplica para salarios ≤ 2 SMLMV).`,
        quickReplies: ['¿Cómo se calcula la nómina con SMLMV?', 'Ver parafiscales'],
        emotionalState: 'thoughtful',
      };
    }

    case 'DOMAIN_DEFINITION': {
      const term = (params.term as string ?? '').toUpperCase();

      if (term === 'SMLV') {
        const year = new Date().getFullYear().toString();
        const cfg = await getPayrollConfig(supabase, companyId, year);
        const smlmv = cfg ? `$${Number(cfg.salary_min).toLocaleString('es-CO')}` : '(ver Configuración → Parámetros Legales)';
        const auxilio = cfg ? `$${Number(cfg.transport_allowance).toLocaleString('es-CO')}` : '(ver Configuración)';
        return {
          message: `**SMLMV (Salario Mínimo Legal Mensual Vigente) ${year}:** ${smlmv} | **Auxilio de transporte:** ${auxilio} (aplica para salarios ≤ 2 SMLMV).`,
          quickReplies: ['Ver todos los aportes parafiscales', 'Calcular costo total de un empleado'],
          emotionalState: 'thoughtful',
        };
      }

      const definitions: Record<string, string> = {
        EPS: '**EPS (Entidad Promotora de Salud):** organización que administra y garantiza el acceso a servicios de salud. El empleador aporta el **8,5%** y el empleado el **4%** del salario base.',
        ARL: '**ARL (Administradora de Riesgos Laborales):** cubre accidentes y enfermedades laborales. Lo paga íntegramente el empleador; la tarifa varía entre **0,348% y 8,7%** según el nivel de riesgo del cargo.',
        AFP: '**AFP (Administradora de Fondos de Pensiones):** gestiona el ahorro pensional. El empleador aporta el **12%** y el empleado el **4%** del salario base.',
        CAJA_COMPENSACION: '**Caja de Compensación Familiar:** administra subsidio familiar y otros beneficios. El empleador aporta el **4%** del salario. Ejemplos: Compensar, Colsubsidio, Cafam.',
        PARAFISCALES: '**Parafiscales:** aportes obligatorios del empleador. SENA: **2%**, ICBF: **3%**, Caja de Compensación: **4%** del salario base. Total: **9%** a cargo del empleador.',
      };
      const msg = definitions[term] ?? `**${term}:** término del sistema laboral colombiano. ¿Quieres más detalles sobre este concepto?`;
      return {
        message: msg,
        quickReplies: ['Ver todos los aportes parafiscales', 'Calcular costo total de un empleado'],
        emotionalState: 'thoughtful',
      };
    }

    default: {
      // Generic KISS fallback: employee search by name
      const name = params.name as string ?? '';
      if (name) {
        const { data: employees, error } = await supabase
          .from('employees')
          .select('id, nombre, apellido, cargo, salario_base, tipo_contrato')
          .eq('company_id', companyId)
          .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
          .limit(5);

        if (error) throw new Error(error.message);
        if (!employees?.length) {
          return { message: `No encontré empleados con el nombre "${name}".`, emotionalState: 'thoughtful' };
        }
        const emp = employees[0];
        return {
          message: `**${emp.nombre} ${emp.apellido}** — ${emp.cargo ?? 'Sin cargo'} — Salario base: **$${Number(emp.salario_base).toLocaleString('es-CO')}**`,
          emotionalState: 'thoughtful',
        };
      }
      throw new Error(`No KISS handler for intent: ${intent}`);
    }
  }
}

async function handleKissPath(
  routing: RoutingDecision,
  query: string,
  companyId: string,
  supabase: ReturnType<typeof createClient>,
  router: CostAwareRouter
): Promise<EngineResponse> {
  const intent = routing.matched_intent ?? 'UNKNOWN';
  const kissParams = routing.kiss_params ?? {};
  const cacheKey = router.buildCacheKey(companyId, intent, kissParams);
  const ttl = router.getCacheTTL(intent);

  // 1. Check cache
  const { data: cached } = await supabase
    .from('maya_kiss_cache')
    .select('response')
    .eq('company_id', companyId)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached?.response) {
    console.log(`[ENGINE] KISS cache HIT — intent: ${intent}`);
    return { ...(cached.response as EngineResponse), routing: { ...routing, from_cache: true } };
  }

  // 2. Execute direct Supabase query
  console.log(`[ENGINE] KISS path — intent: ${intent}`);
  const result = await executeKissIntent(intent, kissParams, companyId, supabase);

  // 3. Store in cache
  try {
    await supabase.from('maya_kiss_cache').upsert({
      company_id: companyId,
      cache_key: cacheKey,
      intent,
      response: result,
      ttl_seconds: ttl,
      expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
    }, { onConflict: 'company_id,cache_key' });
  } catch (e) {
    console.warn('[ENGINE] KISS cache write failed:', e);
  }

  return { ...result, routing: { ...routing, from_cache: false } };
}

// ============================================================================
// DAG Path — Plan Generator
// ============================================================================

async function generatePlan(
  query: string,
  conversation: EngineRequest['conversation'],
  context: EngineRequest['context'],
  openaiKey: string
): Promise<ExecutionPlan> {
  const systemPrompt = `Eres el Plan Generator de Maya, sistema multi-agente de nómina colombiana.
Tu trabajo: generar un ExecutionPlan JSON óptimo para la consulta del usuario.

AGENTES DISPONIBLES:
- "nomina": cálculos de nómina, empleados, novedades, prestaciones, incrementos salariales
- "legal": legislación laboral colombiana (CST, DIAN, UGPP, decretos)
- "analytics": tendencias históricas, proyecciones what-if, comparativos de períodos
- "alertas": anomalías, riesgos de compliance, vencimientos de contratos

REGLAS:
1. Una consulta simple → 1 agente, 1 fase.
2. Varios agentes sin dependencia → misma fase, run_parallel: true.
3. Agente B necesita datos de agente A → fases separadas, depends_on_phases + inject_from.
4. optional: true para agentes que enriquecen pero no son críticos.
5. timeout_ms: 2000 default, 4000 para legal (RAG), 1000 para alertas.
6. "mi nómina" / "mi información" = datos de la empresa, NO empleado.

RESPONDE ÚNICAMENTE con JSON válido según ExecutionPlan. Sin texto adicional.

JSON schema:
{
  "plan_id": "uuid",
  "query": "...",
  "intent": "...",
  "phases": [{
    "phase_id": 1,
    "label": "...",
    "run_parallel": true,
    "depends_on_phases": [],
    "timeout_ms": 2000,
    "invocations": [{
      "invocation_id": "inv-001",
      "agent": "nomina",
      "intent": "CONSULTAR_EMPLEADOS",
      "params": {},
      "inject_from": [],
      "optional": false
    }]
  }],
  "estimated_ms": 700,
  "rationale": "...",
  "created_at": "iso-date",
  "fallback_to_kiss": true
}`;

  const recentConversation = conversation.slice(-4)
    .map(m => `${m.role}: ${m.content}`).join('\n');

  const userPrompt = `Query: "${query}"
Contexto conversacional reciente:
${recentConversation || 'Sin historial'}
Empresa: ${(context?.employees as unknown[])?.length ?? '?'} empleados activos | Período: ${context?.currentPeriodId ?? 'desconocido'}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error(`Plan Generator: HTTP ${response.status}`);

  const data = await response.json();
  const planJson = data.choices?.[0]?.message?.content;

  try {
    const plan = JSON.parse(planJson) as ExecutionPlan;
    // Ensure plan_id is set
    if (!plan.plan_id) plan.plan_id = crypto.randomUUID();
    return plan;
  } catch {
    console.warn('[ENGINE] Plan Generator returned invalid JSON — using fallback plan');
    return {
      plan_id: crypto.randomUUID(),
      query,
      intent: 'CONSULTA_GENERAL',
      phases: [{
        phase_id: 1,
        label: 'Consulta general de nómina',
        run_parallel: false,
        depends_on_phases: [],
        timeout_ms: 2000,
        invocations: [{
          invocation_id: `inv-${crypto.randomUUID()}`,
          agent: 'nomina',
          intent: 'CONSULTA_GENERAL',
          params: { query },
          inject_from: [],
          optional: false,
        }],
      }],
      estimated_ms: 700,
      rationale: 'Fallback plan due to Plan Generator JSON parse failure',
      created_at: new Date().toISOString(),
      fallback_to_kiss: true,
    };
  }
}

// ============================================================================
// DAG Path — Execution Engine
// ============================================================================

/** Detect cycles in the phase dependency graph using DFS */
function validateDAG(plan: ExecutionPlan): void {
  const phaseIds = new Set(plan.phases.map(p => p.phase_id));

  for (const phase of plan.phases) {
    for (const dep of phase.depends_on_phases) {
      if (!phaseIds.has(dep)) {
        throw new Error(`Phase ${phase.phase_id} depends on non-existent phase ${dep}`);
      }
      if (dep >= phase.phase_id) {
        throw new Error(`Phase ${phase.phase_id} depends on future/same phase ${dep} — invalid DAG`);
      }
    }
  }
  // Simple cycle check: if phase_id ordering is consistent, no cycles exist
  // (phases must depend only on lower phase_ids)
}

async function callAgentWithTimeout(
  agent: AgentType,
  requestBody: Record<string, unknown>,
  timeoutMs: number,
  supabase: ReturnType<typeof createClient>
): Promise<AgentResponse> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const { data, error } = await supabase.functions.invoke(`agent-${agent}`, {
      body: requestBody,
    });

    clearTimeout(timeoutId);

    if (error) {
      console.error(`[ENGINE] Agent ${agent} error:`, error);
      return {
        invocation_id: requestBody.invocation_id as string ?? crypto.randomUUID(),
        data: {},
        summary: `Error en agente ${agent}: ${error.message}`,
        side_alerts: [],
        confidence: 0,
        sources: [],
        latency_ms: 0,
        needs_escalation: false,
        success: false,
        error: error.message,
      };
    }

    return data as AgentResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      invocation_id: requestBody.invocation_id as string ?? crypto.randomUUID(),
      data: {},
      summary: isTimeout ? `Timeout en agente ${agent}` : `Error inesperado en agente ${agent}`,
      side_alerts: [],
      confidence: 0,
      sources: [],
      latency_ms: timeoutMs,
      needs_escalation: !isTimeout,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function executeDAG(
  plan: ExecutionPlan,
  companyId: string,
  userId: string,
  sessionId: string,
  conversation: EngineRequest['conversation'],
  context: EngineRequest['context'],
  supabase: ReturnType<typeof createClient>
): Promise<AgentResponse[]> {
  const agentResultsByType = new Map<AgentType, AgentResponse>();
  const allResults: AgentResponse[] = [];

  for (const phase of plan.phases) {
    // Build enriched request for each invocation in this phase
    const buildRequest = (inv: AgentInvocation): Record<string, unknown> => ({
      plan_id: plan.plan_id,
      invocation_id: inv.invocation_id,
      company_id: companyId,
      user_id: userId,
      session_id: sessionId,
      query: plan.query,
      intent: inv.intent,
      params: inv.params,
      upstream_results: inv.inject_from
        .map(a => agentResultsByType.get(a))
        .filter(Boolean)
        .map(r => ({
          agent: r!.invocation_id,  // use invocation_id for tracing
          invocation_id: r!.invocation_id,
          data: r!.data,
          summary: r!.summary ?? r!.explanation ?? '',
          confidence: r!.confidence ?? (r!.success ? 0.8 : 0),
        } satisfies UpstreamResult)),
      conversation_history: conversation.slice(-6),
      max_tokens: 800,
      timeout_ms: phase.timeout_ms,
      // Forward context
      companyId,
      context,
    });

    // Execute phase — parallel or sequential
    let phaseResults: (AgentResponse | null)[];

    if (phase.run_parallel) {
      phaseResults = await Promise.all(
        phase.invocations.map(async (inv) => {
          const req = buildRequest(inv);
          const result = await callAgentWithTimeout(inv.agent, req, phase.timeout_ms, supabase);
          if (!result.success && result.error && !inv.optional) {
            console.error(`[ENGINE] Non-optional agent ${inv.agent} failed:`, result.error);
            return result; // still include, Consolidator handles it
          }
          return result;
        })
      );
    } else {
      phaseResults = [];
      for (const inv of phase.invocations) {
        const req = buildRequest(inv);
        const result = await callAgentWithTimeout(inv.agent, req, phase.timeout_ms, supabase);
        phaseResults.push(result);
        if (result.success !== false) {
          agentResultsByType.set(inv.agent, result);
        } else if (!inv.optional) {
          console.warn(`[ENGINE] Optional-skipped agent ${inv.agent} failed — continuing`);
        }
      }
    }

    // Register parallel results
    phaseResults.forEach((result, i) => {
      if (!result) return;
      const inv = phase.invocations[i];
      if (result.success !== false) {
        agentResultsByType.set(inv.agent, result);
      }
      allResults.push(result);
    });
  }

  return allResults;
}

// ============================================================================
// DAG Path — Consolidator
// ============================================================================

async function consolidate(
  query: string,
  plan: ExecutionPlan,
  agentResponses: AgentResponse[],
  openaiKey: string
): Promise<string> {
  const responseSummaries = agentResponses.map(r => {
    const ok = r.success !== false && !r.error;
    if (!ok) return `[ERROR] ${r.error ?? 'agente falló'}`;
    const text = r.summary ?? (r.explanation as string | undefined) ?? JSON.stringify(r.data ?? {}).slice(0, 300);
    const confidence = r.confidence ?? 0.8;
    const caveat = confidence < 0.7 ? ' *(ten en cuenta que esta información puede ser incompleta)*' : '';
    return `${text}${caveat}`;
  }).join('\n\n');

  const sideAlerts = agentResponses.flatMap(r => r.side_alerts ?? []);
  const alertsText = sideAlerts.length > 0
    ? '\n\nALERTAS DETECTADAS:\n' + sideAlerts.map(a => `[${a.type.toUpperCase()}] ${a.message}`).join('\n')
    : '';

  const systemPrompt = `Eres Maya, asistente de nómina de Finppi Colombia. Integra los resultados de tus agentes en UNA respuesta clara.

ESTILO:
- Profesional y cercana, como contadora experta de confianza
- Números siempre en pesos colombianos con puntos de miles
- Máximo 300 palabras — si hay datos, usa tablas o bullets
- Menciona side_alerts si son críticos o altos
- NUNCA menciones agentes, DAG, ni arquitectura interna

ESTRUCTURA: respuesta directa → detalle con números → contexto legal → alertas → sugerencia de acción`;

  const userPrompt = `Query original: "${query}"

Resultados de los agentes:
${responseSummaries}${alertsText}

Genera la respuesta final para el usuario.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 700,
    }),
  });

  if (!response.ok) throw new Error(`Consolidator: HTTP ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'No pude generar una respuesta. Por favor intenta nuevamente.';
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
  const kissThreshold = parseFloat(Deno.env.get('KISS_CONFIDENCE_THRESHOLD') ?? '0.90');

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader ?? '' } },
  });

  let body: EngineRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const {
    query,
    conversation = [],
    companyId,
    userId = 'system',
    sessionId = crypto.randomUUID(),
    context,
  } = body;

  if (!query?.trim() || !companyId) {
    return new Response(JSON.stringify({ error: 'query and companyId are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const startTime = Date.now();
    const router = new CostAwareRouter(kissThreshold);
    const routing = router.route(query);

    console.log(`[ENGINE] Routing: ${routing.path} (confidence: ${routing.confidence.toFixed(2)}, threshold: ${kissThreshold})`);

    // ── kiss_clarify — data not found, needs user clarification ─────────────
    if (routing.path === 'kiss_clarify') {
      const hint = routing.fallback_hint;
      const msg  = hint?.clarify_message
        ? `${hint.clarify_message}${hint.clarify_hint ? `\n${hint.clarify_hint}` : ''}`
        : 'No encontré los datos que buscas. ¿Puedes darme más detalles?';
      return new Response(JSON.stringify({
        message:      msg,
        quickReplies: ['Buscar por cédula', 'Buscar por nombre completo'],
        routing,
      } satisfies EngineResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── kiss_configure — configuration missing, offer action ────────────────
    if (routing.path === 'kiss_configure') {
      const hint = routing.fallback_hint;
      const msg  = hint?.configure_message ?? 'Parece que falta configurar este parámetro.';
      const qr   = hint?.configure_url ? ['Ir a configuración'] : [];
      return new Response(JSON.stringify({
        message:      msg,
        quickReplies: qr,
        routing,
      } satisfies EngineResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── kiss_legal_fallback — legal_critical data not in DB ─────────────────
    if (routing.path === 'kiss_legal_fallback') {
      const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const legalResponse  = await executeKissLegalFallback(routing, query, companyId, supabaseUrl, serviceRoleKey, router);
      return new Response(JSON.stringify(legalResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── KISS Path ────────────────────────────────────────────────────────────
    if (routing.path === 'kiss') {
      const kissResponse = await handleKissPath(routing, query, companyId, supabase, router);
      const latency = Date.now() - startTime;

      // Telemetry: log as KISS plan (no plan_json needed)
      supabase.from('agent_execution_plans').insert({
        company_id: companyId,
        user_id: userId,
        session_id: sessionId,
        original_query: query,
        query,
        plan: {},
        status: 'completed',
        routing_path: 'kiss',
        routing_confidence: routing.confidence,
        from_cache: kissResponse.routing?.from_cache ?? false,
        total_latency_ms: latency,
        completed_at: new Date().toISOString(),
      }).then(() => {}).catch(console.warn);

      return new Response(JSON.stringify(kissResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DAG Path — check quota before invoking Plan Generator ───────────────
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const budgetSvc      = new TokenBudgetService(supabaseUrl, serviceRoleKey);
    const budget         = await budgetSvc.checkBudget(companyId);

    if (!budget.can_consume) {
      // Quota exhausted — respond with KISS data + upgrade CTA (never say "no")
      const kissResponse = await handleKissPath(routing, query, companyId, supabase, router);
      const upgradeMsg   = budget.upgrade_message ?? '';
      return new Response(JSON.stringify({
        ...kissResponse,
        message: kissResponse.message
          ? `${kissResponse.message}\n\n${upgradeMsg}`
          : upgradeMsg,
        quickReplies: ['Ver planes', ...(kissResponse.quickReplies ?? [])],
      } satisfies EngineResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const plan = await generatePlan(query, conversation, context, openaiKey);
    console.log(`[ENGINE] DAG plan: ${plan.phases.length} phases, intent: ${plan.intent}`);

    // Validate DAG (detect cycles / invalid dependencies)
    try {
      validateDAG(plan);
    } catch (dagErr) {
      console.error('[ENGINE] DAG validation failed:', dagErr);
      // Activate KISS fallback if plan is invalid and fallback is enabled
      if (plan.fallback_to_kiss) {
        const fallbackResponse = await handleKissPath(
          { ...routing, path: 'kiss', reason: 'DAG validation failed — KISS fallback' },
          query, companyId, supabase, router
        );
        return new Response(JSON.stringify(fallbackResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Persist plan
    const { data: planRow } = await supabase
      .from('agent_execution_plans')
      .insert({
        company_id: companyId,
        user_id: userId,
        session_id: sessionId,
        original_query: query,
        query,
        intent: plan.intent,
        plan: plan,
        plan_json: plan,
        status: 'running',
        routing_path: 'dag',
        routing_confidence: routing.confidence,
        from_cache: false,
      })
      .select('id')
      .single();

    const planId = planRow?.id;

    // Execute DAG
    const agentResponses = await executeDAG(
      plan, companyId, userId, sessionId, conversation, context, supabase
    );

    // Persist invocations
    if (planId) {
      const invRows = agentResponses.map((r, idx) => ({
        plan_id: planId,
        invocation_id: r.invocation_id ?? crypto.randomUUID(),
        company_id: companyId,
        agent_name: plan.phases.flatMap(p => p.invocations)[idx]?.agent ?? 'nomina',
        agent: plan.phases.flatMap(p => p.invocations)[idx]?.agent ?? 'nomina',
        phase_index: idx,
        phase_id: idx,
        input: plan.phases.flatMap(p => p.invocations)[idx]?.params ?? {},
        output: r.data ?? {},
        response_summary: r.summary ?? r.explanation,
        confidence: r.confidence ?? null,
        status: r.success !== false ? 'success' : 'failed',
        error: r.error ?? null,
        duration_ms: r.latency_ms ?? null,
        completed_at: new Date().toISOString(),
      }));

      supabase.from('agent_invocations').insert(invRows)
        .then(() => {}).catch(console.warn);

      // Save any side alerts
      const sideAlerts = agentResponses.flatMap(r => r.side_alerts ?? []);
      if (sideAlerts.length > 0) {
        supabase.from('agent_alerts').insert(
          sideAlerts.map(a => ({
            company_id: companyId,
            plan_id: planId,
            agent: 'nomina',
            alert_type: a.type,
            alert_type_v21: a.type,
            category: a.category,
            title: a.message,
            description: a.message,
            action_url: a.action_url ?? null,
            payload: a,
          }))
        ).then(() => {}).catch(console.warn);
      }

      const totalLatency = Date.now() - startTime;
      supabase.from('agent_execution_plans')
        .update({ status: 'completed', total_latency_ms: totalLatency, completed_at: new Date().toISOString() })
        .eq('id', planId)
        .then(() => {}).catch(console.warn);
    }

    // Consolidate
    const consolidatedMessage = await consolidate(query, plan, agentResponses, openaiKey);

    const executableActions = agentResponses.flatMap(r => r.executable_actions ?? []);
    const quickReplies = agentResponses.flatMap(r => r.quick_replies ?? []);

    // Consume 1 quota after successful DAG execution (fire-and-forget)
    budgetSvc.consume({
      companyId,
      routingPath:      'dag',
      agentCount:       agentResponses.length,
      estimatedCostUsd: 0.010,
    }).catch(console.warn);

    const responseBody: EngineResponse = {
      message: consolidatedMessage,
      executableActions,
      quickReplies,
      emotionalState: 'thoughtful',
      planId,
      routing,
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ENGINE] Fatal error:', err);
    return new Response(
      JSON.stringify({
        message: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.',
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
