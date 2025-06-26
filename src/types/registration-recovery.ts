
export interface IncompleteRegistration {
  user_id: string;
  email: string;
  has_profile: boolean;
  has_company: boolean;
  has_roles: boolean;
  company_id?: string;
}

export interface CompanyCreationData {
  nit: string;
  razon_social: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface RecoveryResult {
  total: number;
  completed: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    error?: string;
  }>;
}
