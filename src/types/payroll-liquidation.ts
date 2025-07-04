
/**
 * ✅ TIPOS ESTRICTOS PARA LIQUIDACIÓN DE NÓMINA - CORRECCIÓN FASE 1
 * Define interfaces claras y Result pattern para manejo seguro de errores
 */

import { PayrollEmployee, PayrollSummary, PeriodStatus } from './payroll';

// Result pattern corregido para manejo consistente de errores
export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// Estados específicos del proceso de cierre
export type ClosureStep = 'validation' | 'snapshot' | 'closure' | 'verification' | 'completed' | 'error';

// Resultado del servicio de cierre con tipos estrictos
export interface PayrollClosureResult {
  success: boolean;
  message: string;
  transactionId?: string;
  rollbackExecuted?: boolean;
  postClosureResult?: PostClosureResult;
}

// Resultado de detección post-cierre
export interface PostClosureResult {
  success: boolean;
  message?: string;
  nextPeriodSuggestion?: NextPeriodSuggestion;
  error?: string;
}

// Sugerencia de siguiente período
export interface NextPeriodSuggestion {
  startDate: string;
  endDate: string;
  periodName: string;
  type: 'semanal' | 'quincenal' | 'mensual';
}

// Estado del hook de liquidación
export interface PayrollLiquidationState {
  isLoading: boolean;
  isProcessing: boolean;
  currentPeriod: any | null;
  employees: PayrollEmployee[];
  selectedEmployees: string[];
  summary: PayrollSummary;
  periodStatus: PeriodStatus | null;
  closureStep: ClosureStep;
  transactionId?: string;
  rollbackExecuted: boolean;
  postClosureResult: PostClosureResult | null;
}

// Acciones del hook de liquidación
export interface PayrollLiquidationActions {
  removeEmployeeFromPeriod: (employeeId: string) => Promise<void>;
  createNovedadForEmployee: (employeeId: string, novedadData: any) => Promise<void>;
  recalculateAfterNovedadChange: (employeeId: string) => Promise<void>;
  toggleEmployeeSelection: (employeeId: string) => void;
  toggleAllEmployees: () => void;
  recalculateAll: () => Promise<void>;
  closePeriod: () => Promise<void>;
  createNewPeriod: () => Promise<void>;
  refreshPeriod: () => Promise<void>;
}
