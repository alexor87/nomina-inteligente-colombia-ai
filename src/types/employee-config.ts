
export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'list';
export type ContractType = 'indefinido' | 'fijo' | 'prestacion' | 'obra' | 'aprendiz';
export type PaymentPeriodicity = 'quincenal' | 'mensual';
export type ARLRiskLevel = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  visibleOnlyToHR: boolean;
  editableByEmployee: boolean;
  options?: string[]; // Para campos tipo lista
}

export interface ValidationRules {
  allowWithoutEPS: boolean;
  allowWithoutCajaCompensacion: boolean;
  allowPendingAffiliations: boolean;
  validateARLRiskLevel: boolean;
  allowEditBaseSalary: boolean;
}

export interface DefaultParameters {
  defaultContractType: ContractType;
  standardWorkingHours: number;
  suggestedPaymentPeriodicity: PaymentPeriodicity;
  suggestedCostCenter: string;
  defaultARLRiskLevel: ARLRiskLevel;
}

export interface EmployeeGlobalConfiguration {
  customFields: CustomField[];
  validationRules: ValidationRules;
  defaultParameters: DefaultParameters;
}

export const ARL_RISK_PERCENTAGES = {
  'I': 0.00348,
  'II': 0.00435,
  'III': 0.00783,
  'IV': 0.01740,
  'V': 0.03480
};

export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí/No' },
  { value: 'list', label: 'Lista desplegable' }
];

export const CONTRACT_TYPES = [
  { value: 'indefinido', label: 'Término Indefinido' },
  { value: 'fijo', label: 'Término Fijo' },
  { value: 'prestacion', label: 'Prestación de Servicios' },
  { value: 'obra', label: 'Obra o Labor' },
  { value: 'aprendiz', label: 'Aprendiz' }
];

export const ARL_RISK_LEVELS = [
  { value: 'I', label: 'Nivel I (0.348%)', percentage: 0.00348 },
  { value: 'II', label: 'Nivel II (0.435%)', percentage: 0.00435 },
  { value: 'III', label: 'Nivel III (0.783%)', percentage: 0.00783 },
  { value: 'IV', label: 'Nivel IV (1.740%)', percentage: 0.01740 },
  { value: 'V', label: 'Nivel V (3.480%)', percentage: 0.03480 }
];
