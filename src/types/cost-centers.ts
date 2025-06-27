
export interface CostCenter {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostCenterFormData {
  code: string;
  name: string;
  description: string;
}
