import { CreateNovedadData } from '@/types/novedades-enhanced';

// Interface for pending novelties in closed periods
export interface PendingNovedad {
  employee_id: string;
  employee_name: string;
  tipo_novedad: string;
  valor: number;
  observacion?: string;
  novedadData: CreateNovedadData & {
    action?: 'create' | 'delete'; // Action type for pending adjustment
    novedad_id?: string; // For delete actions, reference to original novedad
  };
}

// Period state types
export type PeriodState = 'borrador' | 'cerrado' | 'procesada' | 'pagada' | 'con_errores' | 'editado' | 'reabierto';

// Modal modes
export type NovedadModalMode = 'liquidacion' | 'ajustes';

// Preview data for pending changes
export interface EmployeeNovedadPreview {
  originalDevengado: number;
  newDevengado: number;
  originalDeducciones: number;
  newDeducciones: number;
  originalNeto: number;
  newNeto: number;
  originalIBC: number;
  newIBC: number;
  pendingCount: number;
  hasPending: boolean;
}