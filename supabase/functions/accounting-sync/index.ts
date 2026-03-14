import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================================
// ACCOUNTING SYNC - Multi-Provider Integration
// ============================================================================

interface SyncRequest {
  action: 'test-connection' | 'sync' | 'get-status';
  data: {
    company_id?: string;
    period_id?: string;
    provider?: string;
    credentials?: Record<string, string>;
    provider_config?: Record<string, any>;
  };
}

interface JournalEntry {
  account: string;
  description: string;
  debit: number;
  credit: number;
}

// ============================================================================
// Adapter Interface & Implementations
// ============================================================================

interface AccountingAdapter {
  testConnection(): Promise<{ success: boolean; message: string }>;
  createJournalEntry(entries: JournalEntry[], periodLabel: string): Promise<{ success: boolean; reference?: string; error?: string }>;
}

// Basic Auth Adapter (Siigo, Alegra, Helisa)
class BasicAuthAdapter implements AccountingAdapter {
  constructor(
    private baseUrl: string,
    private username: string,
    private apiKey: string,
    private testEndpoint: string,
    private journalEndpoint: string,
    private providerName: string,
    private extraHeaders: Record<string, string> = {}
  ) {}

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}${this.testEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.apiKey}`)}`,
          'Content-Type': 'application/json',
          ...this.extraHeaders
        }
      });

      if (response.ok) {
        return { success: true, message: `Conexión exitosa con ${this.providerName}` };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || `Error de autenticación: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  async createJournalEntry(entries: JournalEntry[], periodLabel: string) {
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

      const response = await fetch(`${this.baseUrl}${this.journalEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.apiKey}`)}`,
          'Content-Type': 'application/json',
          ...this.extraHeaders
        },
        body: JSON.stringify(journalData)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, reference: data.id?.toString() };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.message || `Error: ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Bearer Token Adapter (World Office, Contai, Monica, TNS)
class BearerTokenAdapter implements AccountingAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private testEndpoint: string,
    private journalEndpoint: string,
    private providerName: string
  ) {}

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}${this.testEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true, message: `Conexión exitosa con ${this.providerName}` };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || `Error de autenticación: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  async createJournalEntry(entries: JournalEntry[], periodLabel: string) {
    try {
      const journalData = {
        date: new Date().toISOString().split('T')[0],
        observations: `Asiento contable nómina - ${periodLabel}`,
        entries: entries.map(entry => ({
          account: { id: entry.account },
          description: entry.description,
          debit: entry.debit,
          credit: entry.credit
        }))
      };

      const response = await fetch(`${this.baseUrl}${this.journalEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(journalData)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, reference: data.id?.toString() };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.message || `Error: ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Generic Webhook Adapter
class WebhookAdapter implements AccountingAdapter {
  constructor(
    private webhookUrl: string,
    private apiKey: string | null,
    private headerName: string
  ) {}

  async testConnection() {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey && this.headerName) {
        headers[this.headerName] = this.apiKey;
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'test', timestamp: new Date().toISOString() })
      });

      if (response.ok || response.status === 204) {
        return { success: true, message: 'Conexión exitosa con el webhook' };
      }
      return { success: false, message: `El webhook respondió con código ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  async createJournalEntry(entries: JournalEntry[], periodLabel: string) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey && this.headerName) {
        headers[this.headerName] = this.apiKey;
      }

      const payload = {
        action: 'create_journal_entry',
        date: new Date().toISOString().split('T')[0],
        period: periodLabel,
        entries
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { success: true, reference: data.reference || data.id || 'webhook-ok' };
      }
      return { success: false, error: `Webhook error: ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// CSV Export "Adapter" (no-op for sync, entries are generated client-side)
class CsvExportAdapter implements AccountingAdapter {
  async testConnection() {
    return { success: true, message: 'Exportación CSV no requiere conexión' };
  }
  async createJournalEntry(entries: JournalEntry[], periodLabel: string) {
    return { success: true, reference: `csv-${periodLabel}` };
  }
}

// ============================================================================
// Provider config definitions (server-side)
// ============================================================================
const PROVIDER_DEFAULTS: Record<string, { authType: string; baseUrl: string; testEndpoint: string; journalEndpoint: string; extraHeaders?: Record<string, string> }> = {
  siigo: { authType: 'basic', baseUrl: 'https://api.siigo.com/v1', testEndpoint: '/users', journalEndpoint: '/journals', extraHeaders: { 'Partner-Id': 'NominaInteligente' } },
  alegra: { authType: 'basic', baseUrl: 'https://api.alegra.com/api/v1', testEndpoint: '/company', journalEndpoint: '/journal-entries' },
  helisa: { authType: 'basic', baseUrl: 'https://api.helisa.com', testEndpoint: '/status', journalEndpoint: '/accounting/journal-entries' },
  world_office: { authType: 'bearer', baseUrl: '', testEndpoint: '/status', journalEndpoint: '/journal-entries' },
  contai: { authType: 'bearer', baseUrl: 'https://api.contai.co', testEndpoint: '/v1/account', journalEndpoint: '/v1/journal-entries' },
  monica: { authType: 'bearer', baseUrl: '', testEndpoint: '/status', journalEndpoint: '/journal-entries' },
  tns: { authType: 'bearer', baseUrl: '', testEndpoint: '/health', journalEndpoint: '/api/journal-entries' },
  webhook: { authType: 'custom', baseUrl: '', testEndpoint: '', journalEndpoint: '' },
  csv_export: { authType: 'none', baseUrl: '', testEndpoint: '', journalEndpoint: '' },
};

function createAdapter(
  provider: string,
  credentials: Record<string, string>,
  providerConfig: Record<string, any>
): AccountingAdapter {
  const defaults = PROVIDER_DEFAULTS[provider];
  if (!defaults) {
    throw new Error(`Proveedor no soportado: ${provider}`);
  }

  const baseUrl = providerConfig.base_url || defaults.baseUrl;
  const testEndpoint = providerConfig.test_endpoint || defaults.testEndpoint;
  const journalEndpoint = defaults.journalEndpoint;
  const authType = providerConfig.auth_type || defaults.authType;

  switch (authType) {
    case 'basic':
      return new BasicAuthAdapter(
        baseUrl,
        credentials.username || credentials.email || '',
        credentials.api_key || '',
        testEndpoint,
        journalEndpoint,
        provider,
        defaults.extraHeaders || {}
      );
    case 'bearer':
      return new BearerTokenAdapter(
        baseUrl,
        credentials.api_key || '',
        testEndpoint,
        journalEndpoint,
        provider
      );
    case 'custom':
      return new WebhookAdapter(
        baseUrl || credentials.webhook_url || providerConfig.webhook_url || '',
        credentials.api_key || null,
        providerConfig.header_name || credentials.header_name || 'Authorization'
      );
    case 'none':
      return new CsvExportAdapter();
    default:
      throw new Error(`Tipo de autenticación no soportado: ${authType}`);
  }
}

// ============================================================================
// Generate journal entries from payroll data
// ============================================================================
async function generatePayrollJournalEntries(
  supabaseClient: any,
  companyId: string,
  periodId: string
): Promise<{ entries: JournalEntry[]; periodLabel: string }> {
  const { data: period } = await supabaseClient
    .from('payroll_periods_real')
    .select('periodo, total_devengado, total_deducciones, total_neto')
    .eq('id', periodId)
    .single();

  if (!period) throw new Error('Período no encontrado');

  const { data: mappings } = await supabaseClient
    .from('accounting_account_mappings')
    .select('concept, entry_type, puc_account, puc_description')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (!mappings || mappings.length === 0) throw new Error('No hay mapeo de cuentas PUC configurado');

  const { data: payrolls } = await supabaseClient
    .from('payrolls')
    .select('*')
    .eq('period_id', periodId)
    .eq('company_id', companyId);

  const mappingLookup: Record<string, { account: string; description: string }> = {};
  for (const m of mappings) {
    mappingLookup[`${m.concept}_${m.entry_type}`] = { account: m.puc_account, description: m.puc_description };
  }

  const entries: JournalEntry[] = [];
  let totalSalarios = 0, totalAuxTransporte = 0, totalSaludEmpleado = 0, totalPensionEmpleado = 0;
  let totalSaludEmpleador = 0, totalPensionEmpleador = 0, totalARL = 0, totalCaja = 0;
  let totalICBF = 0, totalSENA = 0, totalCesantias = 0, totalInteresesCesantias = 0;
  let totalPrima = 0, totalVacaciones = 0;

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
  addEntry('salud_empleado', 'credito', totalSaludEmpleado);
  addEntry('pension_empleado', 'credito', totalPensionEmpleado);
  addEntry('neto_pagar', 'credito', period.total_neto || 0);

  return { entries, periodLabel: period.periodo };
}

// ============================================================================
// Main Handler
// ============================================================================
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido o expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { action, data }: SyncRequest = await req.json();
    console.log(`📊 [ACCOUNTING-SYNC] Action: ${action}`, data);

    switch (action) {
      case 'test-connection': {
        const { provider, credentials, provider_config } = data;
        
        if (!provider || !credentials) {
          return new Response(
            JSON.stringify({ success: false, message: 'Faltan parámetros requeridos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const adapter = createAdapter(provider, credentials, provider_config || {});
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
          // Get credentials from secrets
          const providerUpper = integration.provider.toUpperCase();
          const apiKey = Deno.env.get(`${providerUpper}_API_KEY_${company_id}`);
          const username = Deno.env.get(`${providerUpper}_USERNAME_${company_id}`);

          const credentials: Record<string, string> = {};
          if (apiKey) credentials.api_key = apiKey;
          if (username) credentials.username = username;

          if (!apiKey && integration.provider !== 'csv_export') {
            throw new Error('Credenciales no configuradas. Configure las credenciales desde la interfaz de configuración.');
          }

          const { entries, periodLabel } = await generatePayrollJournalEntries(supabaseClient, company_id, period_id);

          if (entries.length === 0) {
            throw new Error('No se generaron asientos contables. Verifique el mapeo de cuentas PUC.');
          }

          const adapter = createAdapter(integration.provider, credentials, integration.provider_config || {});
          const result = await adapter.createJournalEntry(entries, periodLabel);

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
          JSON.stringify({ success: true, integration, recent_syncs: recentLogs || [] }),
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
