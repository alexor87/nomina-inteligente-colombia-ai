
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
  type: VacationAbsenceType; // ✅ AGREGADO: Campo tipo
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
  type: VacationAbsenceType; // ✅ AGREGADO: Campo tipo
  start_date: string;
  end_date: string;
  observations?: string;
}

// ✅ AGREGADO: Labels para los tipos de ausencia
export const ABSENCE_TYPE_LABELS: Record<VacationAbsenceType, string> = {
  vacaciones: 'Vacaciones',
  licencia_remunerada: 'Licencia Remunerada',
  licencia_no_remunerada: 'Licencia No Remunerada',
  ausencia: 'Ausencia Injustificada',
  incapacidad: 'Incapacidad'
};

// ✅ AGREGADO: Colores para los tipos de ausencia
export const ABSENCE_TYPE_COLORS: Record<VacationAbsenceType, string> = {
  vacaciones: 'bg-blue-100 text-blue-800',
  licencia_remunerada: 'bg-green-100 text-green-800',
  licencia_no_remunerada: 'bg-yellow-100 text-yellow-800',
  ausencia: 'bg-red-100 text-red-800',
  incapacidad: 'bg-purple-100 text-purple-800'
};
