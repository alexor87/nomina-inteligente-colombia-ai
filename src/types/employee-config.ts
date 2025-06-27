
export const CONTRACT_TYPES = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'fijo', label: 'Término Fijo' },
  { value: 'obra', label: 'Obra o Labor' },
  { value: 'aprendizaje', label: 'Aprendizaje' }
] as const;

export const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PEP', label: 'Permiso Especial de Permanencia' },
  { value: 'PPT', label: 'Permiso por Protección Temporal' }
] as const;

export const DEPARTAMENTOS_COLOMBIA = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 
  'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 
  'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 
  'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 
  'Vaupés', 'Vichada'
] as const;

export const ARL_RISK_LEVELS = [
  { value: 'I', label: 'Nivel I - Riesgo Mínimo' },
  { value: 'II', label: 'Nivel II - Riesgo Bajo' },
  { value: 'III', label: 'Nivel III - Riesgo Medio' },
  { value: 'IV', label: 'Nivel IV - Riesgo Alto' },
  { value: 'V', label: 'Nivel V - Riesgo Máximo' }
] as const;

export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'list', label: 'Lista de opciones' },
  { value: 'boolean', label: 'Sí/No' }
] as const;

// Tipos para campos personalizados
export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'list' | 'boolean';
  required: boolean;
  visibleOnlyToHR: boolean;
  editableByEmployee: boolean;
  options?: string[];
  defaultValue?: string | number | boolean;
}

// Tipos para reglas de validación
export interface ValidationRules {
  allowWithoutEPS: boolean;
  allowWithoutCajaCompensacion: boolean;
  allowPendingAffiliations: boolean;
  validateARLRiskLevel: boolean;
  allowEditBaseSalary: boolean;
}

// Tipos para parámetros por defecto
export interface DefaultParameters {
  defaultContractType: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  standardWorkingHours: number;
  suggestedPaymentPeriodicity: 'quincenal' | 'mensual';
  suggestedCostCenter: string;
  defaultARLRiskLevel: 'I' | 'II' | 'III' | 'IV' | 'V';
}

// Configuración global de empleados
export interface EmployeeGlobalConfiguration {
  customFields: CustomField[];
  validationRules: ValidationRules;
  defaultParameters: DefaultParameters;
}
