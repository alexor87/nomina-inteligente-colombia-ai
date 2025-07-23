
import { NovedadType } from './novedades';

// ✅ USAR TIPOS DEL MÓDULO DE NOVEDADES
export type VacationAbsenceType = Extract<NovedadType, 
  | 'vacaciones'
  | 'licencia_remunerada' 
  | 'licencia_no_remunerada'
  | 'incapacidad'
  | 'ausencia'
>;

export type VacationAbsenceStatus = 'pendiente' | 'liquidada' | 'cancelada';

export interface VacationAbsence {
  id: string;
  employee_id: string;
  company_id: string;
  type: VacationAbsenceType; // ✅ USANDO TIPO FILTRADO DE NOVEDADES
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
  type: VacationAbsenceType; // ✅ USANDO TIPO FILTRADO DE NOVEDADES
  start_date: string;
  end_date: string;
  observations?: string;
}

// ✅ REUTILIZAR LABELS DEL MÓDULO DE NOVEDADES
import { NOVEDAD_CATEGORIES } from './novedades';

export const ABSENCE_TYPE_LABELS: Record<VacationAbsenceType, string> = {
  vacaciones: NOVEDAD_CATEGORIES.devengados.types.vacaciones.label,
  licencia_remunerada: NOVEDAD_CATEGORIES.devengados.types.licencia_remunerada.label,
  licencia_no_remunerada: NOVEDAD_CATEGORIES.devengados.types.licencia_no_remunerada.label,
  incapacidad: NOVEDAD_CATEGORIES.devengados.types.incapacidad.label,
  ausencia: NOVEDAD_CATEGORIES.deducciones.types.ausencia.label
};

// ✅ COLORES CONSISTENTES CON EL MÓDULO DE NOVEDADES
export const ABSENCE_TYPE_COLORS: Record<VacationAbsenceType, string> = {
  vacaciones: 'bg-blue-100 text-blue-800',
  licencia_remunerada: 'bg-green-100 text-green-800',
  licencia_no_remunerada: 'bg-yellow-100 text-yellow-800',
  incapacidad: 'bg-purple-100 text-purple-800',
  ausencia: 'bg-red-100 text-red-800'
};

// ✅ FUNCIÓN HELPER PARA FILTRAR TIPOS APLICABLES A VACACIONES/AUSENCIAS
export const getVacationAbsenceTypes = (): VacationAbsenceType[] => {
  return ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
};
