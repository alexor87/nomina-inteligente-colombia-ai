export interface MayaMessage {
  id: string;
  message: string;
  emotionalState: EmotionalState;
  contextualActions?: string[];
  timestamp: string;
  isVisible: boolean;
}

export type EmotionalState = 
  | 'neutral'
  | 'analyzing' 
  | 'celebrating'
  | 'concerned'
  | 'encouraging'
  | 'thinking';

export interface MayaContext {
  phase: PayrollPhase;
  employeeCount?: number;
  periodName?: string;
  hasErrors?: boolean;
  isProcessing?: boolean;
  completionPercentage?: number;
  validationResults?: any;
  currentPage?: string;
  contextualHelp?: string;
}

export type PayrollPhase = 
  | 'initial'
  | 'period_selection'
  | 'employee_loading'
  | 'data_validation'
  | 'liquidation_ready'
  | 'processing'
  | 'completed'
  | 'error';

export interface MayaEngineConfig {
  apiTimeout: number;
  fallbackMessages: Record<PayrollPhase, string>;
  animationDuration: number;
}