import { ExecutableAction } from './types/ExecutableAction';
import { ReportInsight } from '@/types/insights';
import { SimulationResult } from '@/types/simulation';
import { ProactiveDetectionResult } from '@/types/proactive-detection';

// Re-export for convenience
export type { ReportInsight, SimulationResult, ProactiveDetectionResult };

// Conversation Types
export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  updated_at: string;
  message_count: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyOption {
  value: string;
  label: string;
  icon?: string;
}

export interface MayaMessage {
  id: string;
  message: string;
  emotionalState: EmotionalState;
  contextualActions?: string[];
  executableActions?: ExecutableAction[];
  quickReplies?: QuickReplyOption[];
  fieldName?: string;
  conversationState?: Record<string, any>;
  timestamp: string;
  isVisible: boolean;
  insights?: ReportInsight[];
  reportData?: any;
  simulationResult?: SimulationResult;
  proactiveAlerts?: ProactiveDetectionResult;
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
  errorType?: string;
  errorDetails?: any;
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