
export interface Branch {
  id: string;
  company_id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  department?: string;
  phone?: string;
  manager_name?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchFormData {
  code: string;
  name: string;
  address: string;
  city: string;
  department: string;
  phone: string;
  manager_name: string;
}
