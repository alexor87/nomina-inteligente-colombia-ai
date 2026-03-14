import { supabase } from '@/integrations/supabase/client';
import type { AccountingProvider } from '@/config/accountingProviders';

// Re-export the type for backward compatibility
export type { AccountingProvider } from '@/config/accountingProviders';

// ============================================================================
// AccountingIntegrationService - Multi-Provider Integration Management
// ============================================================================

export interface AccountingIntegration {
  id: string;
  company_id: string;
  provider: string;
  credentials_ref: string | null;
  is_active: boolean;
  auto_sync: boolean;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'error' | 'pending' | null;
  provider_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AccountingSyncLog {
  id: string;
  company_id: string;
  integration_id: string;
  period_id: string | null;
  provider: string;
  status: 'pending' | 'success' | 'error';
  entries_sent: number;
  response_data: Record<string, any>;
  error_message: string | null;
  external_reference: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export interface SyncResult {
  success: boolean;
  entries_sent?: number;
  reference?: string;
  error?: string;
}

export class AccountingIntegrationService {
  static async getIntegration(companyId: string): Promise<AccountingIntegration | null> {
    const { data, error } = await supabase
      .from('accounting_integrations')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching integration:', error);
      return null;
    }

    return data as AccountingIntegration | null;
  }

  static async saveIntegration(
    companyId: string,
    provider: AccountingProvider,
    autoSync: boolean = false,
    providerConfig: Record<string, any> = {}
  ): Promise<{ success: boolean; error?: string }> {
    const existing = await this.getIntegration(companyId);

    if (existing) {
      const { error } = await supabase
        .from('accounting_integrations')
        .update({
          provider,
          auto_sync: autoSync,
          provider_config: providerConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('accounting_integrations')
        .insert({
          company_id: companyId,
          provider,
          auto_sync: autoSync,
          provider_config: providerConfig,
          is_active: false
        });

      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  }

  static async activateIntegration(companyId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('accounting_integrations')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  static async deactivateIntegration(companyId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('accounting_integrations')
      .update({ 
        is_active: false, 
        credentials_ref: null,
        updated_at: new Date().toISOString() 
      })
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  static async updateAutoSync(companyId: string, autoSync: boolean): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('accounting_integrations')
      .update({ auto_sync: autoSync, updated_at: new Date().toISOString() })
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  static async testConnection(
    provider: AccountingProvider,
    credentials: Record<string, string>,
    providerConfig?: Record<string, any>
  ): Promise<TestConnectionResult> {
    const { data, error } = await supabase.functions.invoke('accounting-sync', {
      body: {
        action: 'test-connection',
        data: {
          provider,
          credentials,
          provider_config: providerConfig
        }
      }
    });

    if (error) {
      return { success: false, message: `Error de conexión: ${error.message}` };
    }

    return data as TestConnectionResult;
  }

  static async syncPeriod(companyId: string, periodId: string): Promise<SyncResult> {
    const { data, error } = await supabase.functions.invoke('accounting-sync', {
      body: {
        action: 'sync',
        data: {
          company_id: companyId,
          period_id: periodId
        }
      }
    });

    if (error) return { success: false, error: error.message };
    return data as SyncResult;
  }

  static async getSyncHistory(companyId: string, limit: number = 10): Promise<AccountingSyncLog[]> {
    const { data, error } = await supabase
      .from('accounting_sync_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sync history:', error);
      return [];
    }

    return (data || []) as AccountingSyncLog[];
  }

  static async getPeriodSyncLogs(periodId: string): Promise<AccountingSyncLog[]> {
    const { data, error } = await supabase
      .from('accounting_sync_logs')
      .select('*')
      .eq('period_id', periodId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching period sync logs:', error);
      return [];
    }

    return (data || []) as AccountingSyncLog[];
  }

  static async isAutoSyncEnabled(companyId: string): Promise<boolean> {
    const integration = await this.getIntegration(companyId);
    return integration?.is_active === true && integration?.auto_sync === true;
  }
}
