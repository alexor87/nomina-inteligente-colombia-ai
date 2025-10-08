export type SimulationType = 
  | 'hire_employees'
  | 'salary_increase'
  | 'salary_decrease'
  | 'overtime_change'
  | 'bonus_change'
  | 'benefit_change';

export interface SimulationScenario {
  id: string;
  type: SimulationType;
  name: string;
  description: string;
  parameters: SimulationParameters;
  createdAt: string;
}

export interface SimulationParameters {
  // Para contratación de empleados
  newEmployees?: {
    count: number;
    averageSalary: number;
    contractType?: string;
    startDate?: string;
  };
  
  // Para cambios salariales
  salaryChange?: {
    type: 'percentage' | 'fixed';
    value: number;
    affectedEmployees?: string[]; // IDs o 'all'
    effectiveDate?: string;
  };
  
  // Para horas extra
  overtimeChange?: {
    averageHoursPerMonth: number;
    affectedEmployees?: string[];
  };
  
  // Para bonificaciones
  bonusChange?: {
    type: 'one_time' | 'recurring';
    amount: number;
    frequency?: 'monthly' | 'quarterly' | 'annual';
    affectedEmployees?: string[];
  };
  
  // Período de proyección
  projectionMonths?: number;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  baseline: FinancialSnapshot;
  projected: FinancialSnapshot;
  comparison: SimulationComparison;
  roi: ROIAnalysis;
  timeline: MonthlyProjection[];
  recommendations: string[];
  risks: string[];
  generatedAt: string;
}

export interface FinancialSnapshot {
  period: string;
  employeeCount: number;
  totalSalaries: number;
  totalBenefits: number;
  socialSecurity: {
    health: number;
    pension: number;
    arl: number;
    compensationBox: number;
    total: number;
  };
  parafiscales: {
    icbf: number;
    sena: number;
    total: number;
  };
  provisions: {
    prima: number;
    cesantias: number;
    interesesCesantias: number;
    vacaciones: number;
    total: number;
  };
  totalCost: number;
  averageCostPerEmployee: number;
}

export interface SimulationComparison {
  employeeCountChange: number;
  totalCostChange: number;
  totalCostChangePercentage: number;
  monthlyCostIncrease: number;
  annualCostIncrease: number;
  costPerEmployeeChange: number;
  breakEvenMonths?: number;
}

export interface ROIAnalysis {
  investmentRequired: number;
  expectedReturn?: number;
  paybackPeriod?: number; // Meses para recuperar inversión
  netPresentValue?: number;
  internalRateOfReturn?: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
  assumptions: string[];
}

export interface MonthlyProjection {
  month: number;
  monthName: string;
  employeeCount: number;
  totalCost: number;
  cumulativeCost: number;
  cashFlow?: number;
}

export interface SimulationSummary {
  title: string;
  description: string;
  keyFindings: {
    icon: string;
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}
