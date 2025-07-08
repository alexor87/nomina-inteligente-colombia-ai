
// Tipos para el sistema de campos dinámicos por empresa

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'email' | 'phone';

export interface CustomField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: CustomFieldType;
  field_options?: any; // Para opciones de select, validaciones, etc.
  is_required: boolean;
  default_value?: any;
  sort_order: number;
  visibleOnlyToHR?: boolean;
  editableByEmployee?: boolean;
}

export interface CompanyFieldConfiguration {
  id: string;
  company_id: string;
  custom_fields: CustomField[];
  created_at: string;
  updated_at: string;
}

export interface SchemaVersion {
  id: string;
  company_id: string;
  version_number: number;
  changes_summary: string;
  field_definitions: CustomField[];
  created_by?: string;
  created_at: string;
}

// Parámetros por defecto para nuevos empleados
export interface DefaultParameters {
  defaultContractType: ContractType;
  standardWorkingHours: number;
  suggestedPaymentPeriodicity: 'quincenal' | 'mensual';
  suggestedCostCenter: string;
  defaultARLRiskLevel: ARLRiskLevel;
}

// Tipos de contrato disponibles
export type ContractType = 'indefinido' | 'fijo' | 'obra_labor' | 'temporal' | 'aprendizaje' | 'practicas';

export const CONTRACT_TYPES = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'fijo', label: 'Término Fijo' },
  { value: 'obra_labor', label: 'Obra o Labor' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
  { value: 'practicas', label: 'Prácticas' }
] as const;

// Niveles de riesgo ARL
export type ARLRiskLevel = '1' | '2' | '3' | '4' | '5';

export const ARL_RISK_LEVELS = [
  { value: '1', label: 'Clase I - Riesgo Mínimo' },
  { value: '2', label: 'Clase II - Riesgo Bajo' },
  { value: '3', label: 'Clase III - Riesgo Medio' },
  { value: '4', label: 'Clase IV - Riesgo Alto' },
  { value: '5', label: 'Clase V - Riesgo Máximo' }
] as const;

// Tipos de campos personalizados disponibles
export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí/No' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' }
] as const;

// Reglas de validación para empleados
export interface ValidationRule {
  id: string;
  field: string;
  rule_type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any;
  message: string;
  is_active: boolean;
}

// Configuración global de empleados por empresa
export interface EmployeeGlobalConfiguration {
  company_id: string;
  default_parameters: DefaultParameters;
  custom_fields: CustomField[];
  validation_rules: ValidationRule[];
  updated_at: string;
}
