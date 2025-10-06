export enum FlowType {
  EMPLOYEE_CREATE = 'EMPLOYEE_CREATE',
  PAYROLL_CALCULATE = 'PAYROLL_CALCULATE',
  REPORTS_GENERATE = 'REPORTS_GENERATE',
  BENEFITS_CALCULATE = 'BENEFITS_CALCULATE'
}

export enum FlowStepType {
  GREETING = 'greeting',
  INPUT = 'input',
  SELECT = 'select',
  HUB = 'hub',
  PREVIEW = 'preview',
  EXECUTION = 'execution',
  RESULT = 'result'
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'custom';
  value?: any;
  message: string;
  validator?: (input: string) => boolean;
}

export interface QuickReply {
  label: string;
  value: string;
  icon?: string;
}

export interface FlowStep {
  id: string;
  type: FlowStepType;
  message: string | ((data: Record<string, any>) => string);
  quickReplies?: QuickReply[];
  inputPlaceholder?: string;
  inputType?: 'text' | 'number' | 'date' | 'email';
  validationRules?: ValidationRule[];
  nextStep: string | ((data: Record<string, any>, userInput?: string) => string);
  canGoBack?: boolean;
  canSkip?: boolean;
  skipToStep?: string;
  subFlowId?: string;
}

export interface GuidedFlow {
  id: FlowType;
  name: string;
  description: string;
  icon: string;
  steps: Record<string, FlowStep>;
  initialStep: string;
  completedStep: string;
}

export interface FlowState {
  flowId: FlowType;
  currentStep: string;
  accumulatedData: Record<string, any>;
  history: string[];
  startedAt: string;
  lastUpdatedAt: string;
}
