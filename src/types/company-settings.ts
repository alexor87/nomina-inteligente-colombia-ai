
export interface CompanySettings {
  id?: string;
  company_id: string;
  periodicity: 'semanal' | 'quincenal' | 'mensual';
  custom_period_days?: number;
  provision_mode: 'on_liquidation' | 'monthly_consolidation';
  created_at?: string;
  updated_at?: string;
}

export interface CompanySettingsFormData {
  periodicity: 'semanal' | 'quincenal' | 'mensual';
  custom_period_days?: number;
  provision_mode: 'on_liquidation' | 'monthly_consolidation';
}
