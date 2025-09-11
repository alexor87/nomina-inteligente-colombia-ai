export type PeriodEditState = 
  | 'closed'           // Período cerrado (estado actual)
  | 'editing'          // Período en modo edición
  | 'saving'           // Guardando cambios
  | 'discarding'       // Descartando cambios

export interface EditingSession {
  id: string;
  periodId: string;
  companyId: string;
  userId: string;
  startedAt: string;
  changes: EditingChanges;
  status: 'active' | 'saving' | 'completed' | 'cancelled';
}

export interface EditingChanges {
  employees: {
    added: string[];      // IDs de empleados agregados
    removed: string[];    // IDs de empleados removidos
  };
  novedades: {
    added: NovedadData[];     // Novedades agregadas
    modified: NovedadData[];  // Novedades modificadas
    deleted: string[];        // IDs de novedades eliminadas
  };
  payrollData: {
    [employeeId: string]: EmployeePayrollChanges;
  };
}

export interface NovedadData {
  id?: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  dias?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  observacion?: string;
  constitutivo_salario?: boolean;
}

export interface EmployeePayrollChanges {
  salario_base?: number;
  total_devengado?: number;
  total_deducciones?: number;
  neto_pagado?: number;
  ibc?: number;
  auxilio_transporte?: number;
  salud_empleado?: number;
  pension_empleado?: number;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface EditingSessionCreate {
  periodId: string;
  companyId: string;
  userId: string;
}

export interface PeriodSnapshot {
  periodId: string;
  companyId: string;
  employees: any[];
  payrolls: any[];
  novedades: any[];
  periodData: any;
  snapshotAt: string;
}