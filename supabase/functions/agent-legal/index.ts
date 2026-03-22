// ============================================================================
// Agent Legal — Maya PRD v2.2
// ============================================================================
// Handles legal data lookups for Colombian payroll:
//   SMLMV_VALUE         — salario mínimo mensual legal vigente
//   UVT_VALUE           — unidad de valor tributario
//   TRANSPORT_ALLOWANCE — auxilio de transporte
//   DOMAIN_DEFINITION   — aportes parafiscales, porcentajes, etc.
//
// Data source: company_payroll_configurations (without company_id filter)
// The decree is the same for ALL companies — cache is shared.
//
// If data is not in DB → responds with "consult official source" (confidence: 0).
// NEVER provides a number from model training data for legal_critical values.
// ============================================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AgentRequest, AgentResponse } from '../_shared/multiagent-types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// DB lookup — shared across all companies (no company_id filter)
// ============================================================================

interface LegalData {
  salary_min:          number;
  transport_allowance: number;
  uvt:                 number;
  year:                string;
}

async function getLegalDataForYear(
  adminClient: ReturnType<typeof createClient>,
  year: string | number
): Promise<LegalData | null> {
  const { data, error } = await adminClient
    .from('company_payroll_configurations')
    .select('salary_min, transport_allowance, uvt, year')
    .eq('year', String(year))
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as LegalData;
}

// ============================================================================
// Intent handlers
// ============================================================================

function notFoundResponse(invocationId: string, intent: string, year: string): AgentResponse {
  return {
    invocation_id:    invocationId,
    data:             { found: false, intent, year },
    summary:          `No encontré el valor de ${intent} para ${year} en las fuentes legales verificadas.`,
    side_alerts:      [],
    confidence:       0,
    sources:          [],
    latency_ms:       0,
    needs_escalation: false,
    success:          false,
    explanation:      (
      `No encontré este valor en mis fuentes legales verificadas. ` +
      `Para este dato te recomiendo consultar directamente en el ` +
      `Ministerio del Trabajo (mintrabajo.gov.co) o la DIAN (dian.gov.co) ` +
      `antes de usarlo en una liquidación.`
    ),
  };
}

async function handleSmlmvValue(
  adminClient: ReturnType<typeof createClient>,
  req: AgentRequest
): Promise<AgentResponse> {
  const start = Date.now();
  const year  = String(req.params?.year ?? new Date().getFullYear());
  const data  = await getLegalDataForYear(adminClient, year);

  if (!data) return notFoundResponse(req.invocation_id, 'SMLMV_VALUE', year);

  return {
    invocation_id: req.invocation_id,
    data:          { salary_min: data.salary_min, year: data.year, found: true },
    summary:       `El SMLMV para ${data.year} es $${data.salary_min.toLocaleString('es-CO')}.`,
    side_alerts:   [],
    confidence:    0.98,
    sources:       ['company_payroll_configurations'],
    latency_ms:    Date.now() - start,
    needs_escalation: false,
    success:       true,
    explanation:   `El Salario Mínimo Mensual Legal Vigente (SMLMV) para ${data.year} es $${data.salary_min.toLocaleString('es-CO')}.`,
  };
}

async function handleUvtValue(
  adminClient: ReturnType<typeof createClient>,
  req: AgentRequest
): Promise<AgentResponse> {
  const start = Date.now();
  const year  = String(req.params?.year ?? new Date().getFullYear());
  const data  = await getLegalDataForYear(adminClient, year);

  if (!data || !data.uvt) return notFoundResponse(req.invocation_id, 'UVT_VALUE', year);

  return {
    invocation_id: req.invocation_id,
    data:          { uvt: data.uvt, year: data.year, found: true },
    summary:       `La UVT para ${data.year} es $${data.uvt.toLocaleString('es-CO')}.`,
    side_alerts:   [],
    confidence:    0.98,
    sources:       ['company_payroll_configurations'],
    latency_ms:    Date.now() - start,
    needs_escalation: false,
    success:       true,
    explanation:   `La Unidad de Valor Tributario (UVT) para ${data.year} es $${data.uvt.toLocaleString('es-CO')}.`,
  };
}

async function handleTransportAllowance(
  adminClient: ReturnType<typeof createClient>,
  req: AgentRequest
): Promise<AgentResponse> {
  const start = Date.now();
  const year  = String(req.params?.year ?? new Date().getFullYear());
  const data  = await getLegalDataForYear(adminClient, year);

  if (!data) return notFoundResponse(req.invocation_id, 'TRANSPORT_ALLOWANCE', year);

  return {
    invocation_id: req.invocation_id,
    data:          { transport_allowance: data.transport_allowance, year: data.year, found: true },
    summary:       `El auxilio de transporte para ${data.year} es $${data.transport_allowance.toLocaleString('es-CO')}.`,
    side_alerts:   [],
    confidence:    0.98,
    sources:       ['company_payroll_configurations'],
    latency_ms:    Date.now() - start,
    needs_escalation: false,
    success:       true,
    explanation:   `El auxilio de transporte para ${data.year} es $${data.transport_allowance.toLocaleString('es-CO')} (aplica para empleados que ganen hasta 2 SMLMV).`,
  };
}

// ============================================================================
// Main handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl      = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const agentReq: AgentRequest = await req.json();
    const intent = (agentReq.intent ?? '').toUpperCase();

    let response: AgentResponse;

    switch (intent) {
      case 'SMLMV_VALUE':
        response = await handleSmlmvValue(adminClient, agentReq);
        break;
      case 'UVT_VALUE':
        response = await handleUvtValue(adminClient, agentReq);
        break;
      case 'TRANSPORT_ALLOWANCE':
        response = await handleTransportAllowance(adminClient, agentReq);
        break;
      default:
        // Unknown legal intent — return not-found with guidance
        response = notFoundResponse(agentReq.invocation_id, intent, String(agentReq.params?.year ?? new Date().getFullYear()));
        break;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[agent-legal] Error:', errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
