import { supabase } from '@/integrations/supabase/client';

export interface PayrollVersionData {
  id: string;
  version_number: number;
  snapshot_data: any;
  changes_summary: string;
  created_by: string;
  created_at: string;
  version_type: 'initial' | 'manual' | 'correction';
}

export class PayrollVersionService {
  /**
   * Create initial version snapshot when entering edit mode
   */
  static async createInitialVersion(
    periodId: string, 
    companyId: string, 
    snapshotData: any
  ): Promise<string> {
    try {
      console.log('📸 Creating initial version snapshot for period:', periodId);

      // Get current highest version number
      const { data: versions, error: versionError } = await supabase
        .from('payroll_version_history')
        .select('version_number')
        .eq('period_id', periodId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionError) {
        console.error('❌ Error fetching versions:', versionError);
        throw versionError;
      }

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

      const versionData = {
        company_id: companyId,
        period_id: periodId,
        version_number: nextVersion,
        snapshot_data: snapshotData,
        changes_summary: 'Initial snapshot before editing',
        version_type: 'initial' as const,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data: newVersion, error } = await supabase
        .from('payroll_version_history')
        .insert(versionData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating version:', error);
        throw error;
      }

      console.log('✅ Initial version created:', newVersion.id);
      return newVersion.id;
    } catch (error) {
      console.error('❌ Error in createInitialVersion:', error);
      throw error;
    }
  }

  /**
   * Create new version after applying changes
   */
  static async createNewVersion(
    periodId: string,
    companyId: string,
    snapshotData: any,
    changesSummary: string,
    previousVersionId?: string
  ): Promise<string> {
    try {
      console.log('💾 Creating new version for period:', periodId);

      // Get current highest version number
      const { data: versions, error: versionError } = await supabase
        .from('payroll_version_history')
        .select('version_number')
        .eq('period_id', periodId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionError) {
        throw versionError;
      }

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

      const versionData = {
        company_id: companyId,
        period_id: periodId,
        version_number: nextVersion,
        snapshot_data: snapshotData,
        changes_summary: changesSummary,
        version_type: 'manual' as const,
        previous_version_id: previousVersionId,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data: newVersion, error } = await supabase
        .from('payroll_version_history')
        .insert(versionData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating version:', error);
        throw error;
      }

      console.log('✅ New version created:', newVersion.id);
      return newVersion.id;
    } catch (error) {
      console.error('❌ Error in createNewVersion:', error);
      throw error;
    }
  }

  /**
   * Get version history for a period
   */
  static async getVersionHistory(periodId: string): Promise<PayrollVersionData[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_version_history')
        .select('*')
        .eq('period_id', periodId)
        .order('version_number', { ascending: false });

      if (error) {
        throw error;
      }

      return (data as PayrollVersionData[]) || [];
    } catch (error) {
      console.error('❌ Error getting version history:', error);
      throw error;
    }
  }

  /**
   * Get specific version data
   */
  static async getVersionData(versionId: string): Promise<PayrollVersionData | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_version_history')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) {
        throw error;
      }

      return data as PayrollVersionData;
    } catch (error) {
      console.error('❌ Error getting version data:', error);
      throw error;
    }
  }
}