
export type BenefitType = 'cesantias' | 'intereses_cesantias' | 'prima' | 'vacaciones';

export interface CalculateBenefitPayload {
  employeeId: string;
  benefitType: BenefitType;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  periodId?: string;   // Optional: to get tipo_periodo for interest calculations
  notes?: string;
  save?: boolean;
}

export interface BenefitCalculationPreview {
  success: true;
  mode: 'preview';
  amount: number;
  calculation_basis: any;
  calculated_values: any;
}

export interface BenefitCalculationSaved {
  success: true;
  mode: 'saved';
  amount: number;
  record: any;
  calculation_basis: any;
  calculated_values: any;
}

export type BenefitCalculationResponse =
  | BenefitCalculationPreview
  | BenefitCalculationSaved
  | { success: false; error: string; details?: any; message?: string };
