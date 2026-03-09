import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// ACCOUNTING SYNC - Integration with Siigo & Alegra
// ============================================================================

interface SyncRequest {
  action: 'test-connection' | 'sync' | 'get-status';
  data: {
    company_id?: string;
    period_id?: string;
    provider?: 'siigo' | 'alegra';
    credentials?: {
      api_key?: string;
      username?: string;
    };
  };
}

interface JournalEntry {
  account: string;
  description: string;
  debit: number;
  credit: number;
}

// Siigo API adapter
class SiigoAdapter {
  private baseUrl = 'https://api.siigo.com/v1';
  private apiKey: string;
  private username: string;

  constructor(apiKey: string, username: string) {
    this.apiKey = apiKey;
    this.username = username;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.apiKey}`)}`,
          'Content-Type': 'application/json',
          'Partner-Id': 'NominaInteligente'
        }
      });

      if (response.ok) {
        return { success: true, message: 'Conexión exitosa con Siigo' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          message: errorData.message || `Error de autenticación: ${response.status}` 
        };
      }
    } catch (error: any) {
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  async createJournalEntry(entries: JournalEntry[], periodLabel: string): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const journalData = {
        document: {
          id: 24 // Comprobante de nómina
        },
        date: new Date().toISOString().split('T')[0],
        items: entries.map(entry => ({
          account: { code: entry.account },
          description: entry.description,
          debit: entry.debit,
          credit: entry.credit
        })),
        observations: `Asiento contable nómina - ${periodLabel}`
      };

      const response = await fetch(`${this.baseUrl}/journals`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.apiKey}`)}`,
          'Content-Type': 'application/json',
          'Partner-Id': 'NominaInteligente'
        },
        body: JSON.stringify(journalData)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, reference: data.id?.toString() };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || `Error: ${response.status}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Alegra API adapter
class AlegraAdapter {
  private baseUrl = 'https://api.alegra.com/api/v1';
  private apiKey: string;
  private email: string;

  constructor(apiKey: string, email: string) {
    this.apiKey = apiKey;
    this.email = email;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/company`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.email}:${this.apiKey}`)}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true, message: 'Conexión exitosa con Alegra' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          message: errorData.message || `Error de autenticación: ${response.status}` 
        };
      }
    } catch (error: any) {
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  async createJournalEntry(entries: JournalEntry[], periodLabel: string): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const journalData = {
        date: new Date().toISOString().split('T')[0],
        observations: `Asiento contable nómina - ${periodLabel}`,
        items: entries.map(entry => ({
          account: { code: entry.account },
          description: entry.description,
          debit: entry.debit,
          credit: entry.credit
        }))
      };

      const response = await fetch(`${this.baseUrl}/journal-entries`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.email}:${this.apiKey}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(journalData)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, reference: data.id?.toString() };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || `Error: ${response.status}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Generate journal entries from payroll data
async function generatePayrollJournalEntries(
  supabaseClient: any,
  companyId: string,
  periodId: string
): Promise<{ entries: JournalEntry[]; periodLabel: string }> {
  // Get period info
  const { data: period } = await supabaseClient
    .from('payroll_periods_real')
    .select('periodo, total_devengado, total_deducciones, total_neto')
    .eq('id', periodId)
    .single();

  if (!period) {
    throw new Error('Período no encontrado');
  }

  // Get PUC mappings
  const { data: mappings } = await supabaseClient
    .from('accounting_account_mappings')
    .select('concept, entry_type, puc_account, puc_description')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (!mappings || mappings.length === 0) {
    throw new Error('No hay mapeo de cuentas PUC configurado');
  }

  // Get payroll details for breakdown
  const { data: payrolls } = await supabaseClient
    .from('payrolls')
    .select('*')
    .eq('period_id', periodId)
    .eq('company_id', companyId);

  // Create mapping lookup
  const mappingLookup: Record<string, { account: string; description: string }> = {};
  for (const m of mappings) {
    mappingLookup[`${m.concept}_${m.entry_type}`] = {
      account: m.puc_account,
      description: m.puc_description
    };
  }

  const entries: JournalEntry[] = [];

  // Calculate totals from payrolls
  let totalSalarios = 0;
  let totalAuxTransporte = 0;
  let totalSaludEmpleado = 0;
  let totalPensionEmpleado = 0;
  let totalSaludEmpleador = 0;
  let totalPensionEmpleador = 0;
  let totalARL = 0;
  let totalCaja = 0;
  let totalICBF = 0;
  let totalSENA = 0;
  let totalCesantias = 0;
  let totalInteresesCesantias = 0;
  let totalPrima = 0;
  let totalVacaciones = 0;

  if (payrolls) {
    for (const p of payrolls) {
      totalSalarios += p.salario_base || 0;
      totalAuxTransporte += p.auxilio_transporte || 0;
      totalSaludEmpleado += p.salud_empleado || 0;
      totalPensionEmpleado += p.pension_empleado || 0;
      totalSaludEmpleador += p.salud_empleador || 0;
      totalPensionEmpleador += p.pension_empleador || 0;
      totalARL += p.arl || 0;
      totalCaja += p.caja_compensacion || 0;
      totalICBF += p.icbf || 0;
      totalSENA += p.sena || 0;
      totalCesantias += p.cesantias || 0;
      totalInteresesCesantias += p.intereses_cesantias || 0;
      totalPrima += p.prima || 0;
      totalVacaciones += p.vacaciones || 0;
    }
  }

  // Generate entries based on mappings
  const addEntry = (concept: string, type: 'debito' | 'credito', amount: number) => {
    if (amount <= 0) return;
    const mapping = mappingLookup[`${concept}_${type}`];
    if (mapping) {
      entries.push({
        account: mapping.account,
        description: mapping.description,
        debit: type === 'debito' ? amount : 0,
        credit: type === 'credito' ? amount : 0
      });
    }
  };

  // Débitos (Gastos)
  addEntry('salario_basico', 'debito', totalSalarios);
  addEntry('auxilio_transporte', 'debito', totalAuxTransporte);
  addEntry('salud_empleador', 'debito', totalSaludEmpleador);
  addEntry('pension_empleador', 'debito', totalPensionEmpleador);
  addEntry('arl', 'debito', totalARL);
  addEntry('caja_compensacion', 'debito', totalCaja);
  addEntry('icbf', 'debito', totalICBF);
  addEntry('sena', 'debito', totalSENA);
  addEntry('cesantias', 'debito', totalCesantias);
  addEntry('intereses_cesantias', 'debito', totalInteresesCesantias);
  addEntry('prima', 'debito', totalPrima);
  addEntry('vacaciones', 'debito', totalVacaciones);

  // Créditos (Pasivos/Bancos)
  addEntry('salud_empleado', 'credito', totalSaludEmpleado);
  addEntry('pension_empleado', 'credito', totalPensionEmpleado);
  addEntry('neto_pagar', 'credito', period.total_neto || 0);

  return { entries, periodLabel: period.periodo };
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { action, data }: SyncRequest = await req.json();

    console.log(`📊 [ACCOUNTING-SYNC] Action: ${action}`, data);

    switch (action) {
      case 'test-connection': {
        const { provider, credentials } = data;
        
        if (!provider || !credentials) {
          return new Response(
            JSON.stringify({ success: false, message: 'Faltan parámetros requeridos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let adapter;
        if (provider === 'siigo') {
          adapter = new SiigoAdapter(credentials.api_key!, credentials.username!);
        } else {
          adapter = new AlegraAdapter(credentials.api_key!, credentials.username!);
        }

        const result = await adapter.testConnection();
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync': {
        const { company_id, period_id } = data;

        if (!company_id || !period_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Faltan company_id o period_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get integration config
        const { data: integration, error: intError } = await supabaseClient
          .from('accounting_integrations')
          .select('*')
          .eq('company_id', company_id)
          .eq('is_active', true)
          .single();

        if (intError || !integration) {
          return new Response(
            JSON.stringify({ success: false, error: 'No hay integración activa configurada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create sync log entry
        const { data: syncLog } = await supabaseClient
          .from('accounting_sync_logs')
          .insert({
            company_id,
            integration_id: integration.id,
            period_id,
            provider: integration.provider,
            status: 'pending'
          })
          .select()
          .single();

        try {
          // Get credentials from secrets (stored per company)
          const secretKey = `${integration.provider.toUpperCase()}_API_KEY_${company_id}`;
          const usernameKey = `${integration.provider.toUpperCase()}_USERNAME_${company_id}`;
          
          const apiKey = Deno.env.get(secretKey);
          const username = Deno.env.get(usernameKey);

          if (!apiKey || !username) {
            throw new Error('Credenciales no configuradas. Configure las credenciales desde la interfaz de configuración.');
          }

          // Generate journal entries
          const { entries, periodLabel } = await generatePayrollJournalEntries(
            supabaseClient,
            company_id,
            period_id
          );

          if (entries.length === 0) {
            throw new Error('No se generaron asientos contables. Verifique el mapeo de cuentas PUC.');
          }

          // Create adapter and send to provider
          let adapter;
          if (integration.provider === 'siigo') {
            adapter = new SiigoAdapter(apiKey, username);
          } else {
            adapter = new AlegraAdapter(apiKey, username);
          }

          const result = await adapter.createJournalEntry(entries, periodLabel);

          // Update sync log
          await supabaseClient
            .from('accounting_sync_logs')
            .update({
              status: result.success ? 'success' : 'error',
              entries_sent: entries.length,
              external_reference: result.reference,
              error_message: result.error,
              completed_at: new Date().toISOString(),
              response_data: { entries_count: entries.length }
            })
            .eq('id', syncLog.id);

          // Update integration last sync status
          await supabaseClient
            .from('accounting_integrations')
            .update({
              last_sync_at: new Date().toISOString(),
              last_sync_status: result.success ? 'success' : 'error'
            })
            .eq('id', integration.id);

          return new Response(
            JSON.stringify({
              success: result.success,
              entries_sent: entries.length,
              reference: result.reference,
              error: result.error
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (error: any) {
          // Update sync log with error
          if (syncLog) {
            await supabaseClient
              .from('accounting_sync_logs')
              .update({
                status: 'error',
                error_message: error.message,
                completed_at: new Date().toISOString()
              })
              .eq('id', syncLog.id);
          }

          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'get-status': {
        const { company_id } = data;

        if (!company_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Falta company_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get integration and recent logs
        const { data: integration } = await supabaseClient
          .from('accounting_integrations')
          .select('*')
          .eq('company_id', company_id)
          .single();

        const { data: recentLogs } = await supabaseClient
          .from('accounting_sync_logs')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(10);

        return new Response(
          JSON.stringify({
            success: true,
            integration,
            recent_syncs: recentLogs || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Acción no válida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('❌ [ACCOUNTING-SYNC] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
