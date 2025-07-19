
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
  subtipo?: string; // ✅ NUEVO: Campo subtipo agregado
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
  subtipo?: string; // ✅ NUEVO: Campo subtipo agregado
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

// ✅ NUEVO: Función para obtener subtipos disponibles por tipo
export const getSubtiposForType = (type: VacationAbsenceType): string[] => {
  switch (type) {
    case 'licencia_remunerada':
      return NOVEDAD_CATEGORIES.devengados.types.licencia_remunerada.subtipos || [];
    case 'licencia_no_remunerada':
      return NOVEDAD_CATEGORIES.devengados.types.licencia_no_remunerada.subtipos || [];
    case 'incapacidad':
      return NOVEDAD_CATEGORIES.devengados.types.incapacidad.subtipos || [];
    case 'ausencia':
      return NOVEDAD_CATEGORIES.deducciones.types.ausencia.subtipos || [];
    case 'vacaciones':
    default:
      return [];
  }
};

// ✅ NUEVO: Labels para subtipos
export const SUBTIPO_LABELS: Record<string, string> = {
  // Licencia remunerada
  'paternidad': 'Paternidad',
  'matrimonio': 'Matrimonio',
  'luto': 'Luto',
  'estudio': 'Estudio',
  
  // Licencia no remunerada
  'personal': 'Personal',
  'estudios': 'Estudios',
  'familiar': 'Familiar',
  'salud_no_eps': 'Salud (no EPS)',
  'maternidad_extendida': 'Maternidad Extendida',
  'cuidado_hijo_menor': 'Cuidado Hijo Menor',
  'emergencia_familiar': 'Emergencia Familiar',
  
  // Incapacidad
  'general': 'General',
  'laboral': 'Laboral',
  'maternidad': 'Maternidad',
  
  // Ausencia
  'injustificada': 'Injustificada',
  'abandono_puesto': 'Abandono de Puesto',
  'suspension_disciplinaria': 'Suspensión Disciplinaria',
  'tardanza_excesiva': 'Tardanza Excesiva'
};

// ✅ FUNCIÓN HELPER PARA FILTRAR TIPOS APLICABLES A VACACIONES/AUSENCIAS
export const getVacationAbsenceTypes = (): VacationAbsenceType[] => {
  return ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
};
