
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
  type: VacationAbsenceType;
  subtipo?: string; // ✅ AGREGADO: Campo subtipo opcional
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
  type: VacationAbsenceType;
  subtipo?: string; // ✅ AGREGADO: Campo subtipo opcional
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

// ✅ MAPEO DE SUBTIPOS POR TIPO DE AUSENCIA (KISS: Reutilizar lógica de novedades)
export const VACATION_SUBTYPES: Record<VacationAbsenceType, { value: string; label: string }[]> = {
  vacaciones: [
    { value: 'anuales', label: 'Vacaciones Anuales' },
    { value: 'compensatorias', label: 'Vacaciones Compensatorias' },
    { value: 'colectivas', label: 'Vacaciones Colectivas' }
  ],
  licencia_remunerada: [
    { value: 'paternidad', label: 'Licencia de Paternidad' },
    { value: 'maternidad', label: 'Licencia de Maternidad' },
    { value: 'matrimonio', label: 'Licencia por Matrimonio' },
    { value: 'luto', label: 'Licencia por Luto' },
    { value: 'estudio', label: 'Licencia por Estudios' }
  ],
  licencia_no_remunerada: [
    { value: 'personal', label: 'Licencia Personal' },
    { value: 'estudios', label: 'Licencia por Estudios' },
    { value: 'familiar', label: 'Licencia Familiar' },
    { value: 'salud_no_eps', label: 'Licencia por Salud (No EPS)' },
    { value: 'maternidad_extendida', label: 'Licencia Maternidad Extendida' },
    { value: 'cuidado_hijo_menor', label: 'Licencia Cuidado Hijo Menor' }
  ],
  incapacidad: [
    { value: 'comun', label: 'Incapacidad Común' },
    { value: 'general', label: 'Incapacidad General' },
    { value: 'laboral', label: 'Incapacidad Laboral' }
  ],
  ausencia: [
    { value: 'injustificada', label: 'Ausencia Injustificada' },
    { value: 'abandono_puesto', label: 'Abandono del Puesto' },
    { value: 'suspension_disciplinaria', label: 'Suspensión Disciplinaria' },
    { value: 'tardanza_excesiva', label: 'Tardanza Excesiva' }
  ]
};

// ✅ FUNCIÓN HELPER PARA VALIDAR SI UN TIPO REQUIERE SUBTIPO
export const requiresSubtype = (type: VacationAbsenceType): boolean => {
  return ['licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'].includes(type);
};

// ✅ FUNCIÓN HELPER PARA OBTENER SUBTIPOS DE UN TIPO
export const getSubtypesForType = (type: VacationAbsenceType) => {
  return VACATION_SUBTYPES[type] || [];
};

// ✅ FUNCIÓN HELPER PARA FILTRAR TIPOS APLICABLES A VACACIONES/AUSENCIAS
export const getVacationAbsenceTypes = (): VacationAbsenceType[] => {
  return ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
};
