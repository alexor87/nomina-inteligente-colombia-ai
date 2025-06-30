
export interface EmployeeNote {
  id: string;
  employee_id: string;
  period_id: string;
  company_id: string;
  note_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Datos relacionados para mostrar
  employee?: {
    nombre: string;
    apellido: string;
    cargo?: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
  };
  mentions?: EmployeeNoteMention[];
}

export interface EmployeeNoteMention {
  id: string;
  note_id: string;
  mentioned_user_id: string;
  seen: boolean;
  seen_at?: string;
  created_at: string;
  // Datos del usuario mencionado
  mentioned_user?: {
    first_name: string;
    last_name: string;
  };
}

export interface UserNotification {
  id: string;
  user_id: string;
  company_id: string;
  type: string;
  title: string;
  message: string;
  reference_id?: string;
  read: boolean;
  created_at: string;
}

export interface CompanyUser {
  user_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export interface CreateEmployeeNoteRequest {
  employee_id: string;
  period_id: string;
  note_text: string;
  mentioned_users: string[];
}
