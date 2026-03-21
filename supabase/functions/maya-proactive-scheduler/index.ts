import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Simple hash to deduplicate alerts
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

async function detectAlertsForCompany(supabase: any, companyId: string): Promise<Array<{type: string; title: string; description: string; severity: string}>> {
  const alerts: Array<{type: string; title: string; description: string; severity: string}> = [];
  const today = new Date();

  // 1. Contratos venciendo en ≤ 30 días
  try {
    const { data: expiringContracts } = await supabase
      .from('employees')
      .select('nombre, apellido, fecha_fin_contrato')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .not('fecha_fin_contrato', 'is', null)
      .lte('fecha_fin_contrato', new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0]);

    if (expiringContracts && expiringContracts.length > 0) {
      alerts.push({
        type: 'EXPIRING_CONTRACTS',
        severity: 'high',
        title: `${expiringContracts.length} contrato(s) vencen pronto`,
        description: `Los contratos de ${expiringContracts.slice(0, 3).map((e: any) => `${e.nombre} ${e.apellido}`).join(', ')}${expiringContracts.length > 3 ? ` y ${expiringContracts.length - 3} más` : ''} vencen en los próximos 30 días. ¿Quieres revisar y renovar?`
      });
    }
  } catch { /* skip */ }

  // 2. Pago de seguridad social: primeros 10 días del mes
  const dayOfMonth = today.getDate();
  if (dayOfMonth >= 7 && dayOfMonth <= 10) {
    const { data: latestPayroll } = await supabase
      .from('payrolls')
      .select('periodo, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestPayroll) {
      alerts.push({
        type: 'PILA_REMINDER',
        severity: 'critical',
        title: '📅 Recordatorio PILA',
        description: `Hoy es ${today.toLocaleDateString('es-CO')}. El plazo para el pago de seguridad social vence el día 10. ¿La nómina de ${latestPayroll.periodo} está lista para PILA?`
      });
    }
  }

  // 3. Empleados sin datos completos (sin EPS o AFP)
  try {
    const { data: incompleteEmployees } = await supabase
      .from('employees')
      .select('nombre, apellido')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .or('entidad_salud.is.null,fondo_pension.is.null')
      .limit(10);

    if (incompleteEmployees && incompleteEmployees.length > 0) {
      alerts.push({
        type: 'INCOMPLETE_EMPLOYEES',
        severity: 'medium',
        title: `${incompleteEmployees.length} empleado(s) con datos incompletos`,
        description: `${incompleteEmployees[0].nombre} ${incompleteEmployees[0].apellido}${incompleteEmployees.length > 1 ? ` y ${incompleteEmployees.length - 1} más` : ''} no tiene(n) EPS o AFP registrado. Esto puede afectar la liquidación. ¿Quieres completar los datos ahora?`
      });
    }
  } catch { /* skip */ }

  return alerts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Get all active companies
    const { data: companies } = await adminSupabase
      .from('companies')
      .select('id')
      .limit(500);

    if (!companies || companies.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: corsHeaders });
    }

    let totalAlerts = 0;

    for (const company of companies) {
      try {
        const alerts = await detectAlertsForCompany(adminSupabase, company.id);

        for (const alert of alerts) {
          const alertContent = `${alert.type}:${alert.description}`;
          const hash = simpleHash(alertContent + today.toISOString().slice(0, 7)); // monthly dedup

          // Check if already sent this month
          const { data: existing } = await adminSupabase
            .from('maya_proactive_alerts_sent')
            .select('id')
            .eq('company_id', company.id)
            .eq('alert_type', alert.type)
            .eq('alert_hash', hash)
            .single();

          if (existing) continue;

          // Get the most recent active conversation for this company
          const { data: conv } = await adminSupabase
            .from('maya_conversations')
            .select('id')
            .eq('company_id', company.id)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          if (!conv) continue;

          // Insert the proactive alert as a Maya message
          await adminSupabase
            .from('maya_messages')
            .insert({
              conversation_id: conv.id,
              role: 'assistant',
              content: `🔔 **${alert.title}**\n\n${alert.description}`,
              metadata: {
                isProactiveAlert: true,
                alertType: alert.type,
                severity: alert.severity
              }
            });

          // Mark as sent
          await adminSupabase
            .from('maya_proactive_alerts_sent')
            .insert({ company_id: company.id, alert_type: alert.type, alert_hash: hash });

          totalAlerts++;
        }
      } catch (companyError) {
        console.error(`[proactive-scheduler] Error for company ${company.id}:`, companyError);
      }
    }

    return new Response(JSON.stringify({ ok: true, alertsSent: totalAlerts }), { headers: corsHeaders });
  } catch (error) {
    console.error('[proactive-scheduler] Fatal error:', error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
