import { VacationAbsenceType } from './vacations';

export interface UnifiedVacationData {
  source_type: 'vacation' | 'novedad';
  id: string;
  empleado_id: string;
  company_id: string;
  periodo_id: string | null;
  tipo_novedad: string;
  subtipo: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  valor: number;
  observacion: string | null;
  status: 'pendiente' | 'liquidada' | 'cancelada';
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  employee_nombre: string;
  employee_apellido: string;
  employee_cedula: string;
  employee: {
    id: string;
    nombre: string;
    apellido: string;
    cedula: string;
  };
  
  // Mapped properties for compatibility with VacationAbsence interface
  employee_id: string;
  type: VacationAbsenceType;
  start_date: string;
  end_date: string;
  days_count: number;
  observations: string | null;
  created_by: string | null;
  processed_in_period_id: string | null;
}