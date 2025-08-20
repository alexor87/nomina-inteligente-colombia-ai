
export interface CompanySettings {
  id?: string;
  company_id: string;
  periodicity: 'semanal' | 'quincenal' | 'mensual';
  custom_period_days?: number;
  provision_mode: 'on_liquidation' | 'monthly_consolidation';
  ibc_mode?: 'proportional' | 'incapacity';
  incapacity_policy?: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  created_at?: string;
  updated_at?: string;
}

export interface CompanySettingsFormData {
  periodicity: 'semanal' | 'quincenal' | 'mensual';
  custom_period_days?: number;
  provision_mode: 'on_liquidation' | 'monthly_consolidation';
  ibc_mode?: 'proportional' | 'incapacity';
  incapacity_policy?: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
}
