
export type VacationAbsenceType = 
  | 'vacaciones'
  | 'licencia_remunerada' 
  | 'licencia_no_remunerada'
  | 'ausencia'
  | 'incapacidad';

export type VacationAbsenceStatus = 'pendiente' | 'liquidada' | 'cancelada';

export interface VacationAbsence {
  id: string;
  employee_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  observations?: string;
  status: VacationAbsenceStatus;
  created_by?: string;
  processed_in_period_id?: string;
  created_at: string;
  updated_at: string;
  
  // Datos del empleado (join)
  employee?: {
    id: string;
    nombre: string;
    apellido: string;
    cedula: string;
  };
}

export interface VacationAbsenceFilters {
  type?: VacationAbsenceType;
  status?: VacationAbsenceStatus;
  employee_search?: string;
  date_from?: string;
  date_to?: string;
}

export interface VacationAbsenceFormData {
  employee_id: string;
  start_date: string;
  end_date: string;
  observations?: string;
}
