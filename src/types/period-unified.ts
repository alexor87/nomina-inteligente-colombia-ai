
// Unified period status types for the entire payroll system
export interface UnifiedPeriodStatus {
  hasActivePeriod: boolean;
  currentPeriod?: any;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
    period: string;
  };
  action: 'resume' | 'create' | 'suggest_next' | 'diagnose' | 'emergency';
  message: string;
  diagnostic?: any;
}

// Helper function to determine UI action from system action
export const getUIAction = (systemAction: string): 'resume' | 'create' | 'suggest_next' => {
  switch (systemAction) {
    case 'resume':
      return 'resume';
    case 'create':
      return 'create';
    case 'diagnose':
    case 'emergency':
    default:
      return 'suggest_next';
  }
};
