
export type DocumentType = 'CC' | 'CE' | 'NIT' | 'PEP';
export type Gender = 'M' | 'F' | 'Otro';
export type CivilStatus = 'Soltero' | 'Casado' | 'Unión Libre' | 'Divorciado' | 'Viudo';
export type ContractType = 'indefinido' | 'fijo' | 'prestacion' | 'obra' | 'aprendiz';
export type AffiliateType = 'Dependiente' | 'Independiente' | 'Extranjero';
export type WorkdayType = 'diurna' | 'nocturna' | 'mixta';
export type EmployeeStatus = 'Activo' | 'Vacaciones' | 'Licencia' | 'Retirado';
export type PaymentPeriodicity = 'quincenal' | 'mensual';
export type ARLRiskLevel = 'I' | 'II' | 'III' | 'IV' | 'V';
export type CustomFieldType = 'text' | 'number' | 'list' | 'date' | 'boolean';

export interface PersonalData {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  civilStatus: CivilStatus;
  address: string;
  city: string;
  phone: string;
  personalEmail: string;
}

export interface SecuritySocial {
  eps: string;
  afp: string;
  cajaCompensacion: string;
  affiliateType: AffiliateType;
  affiliationNumber?: string;
  hasBeneficiaries: boolean;
}

export interface LaborData {
  position: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  costCenter: string;
  paymentPeriodicity: PaymentPeriodicity;
  workdayHours: number;
  workdayType: WorkdayType;
  flexibleSchedule: boolean;
  arlRiskLevel: ARLRiskLevel;
}

export interface EmployeeState {
  status: EmployeeStatus;
  includeInPayroll: boolean;
  allowSelfManagement: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  visibleOnlyToHR: boolean;
  editableByEmployee: boolean;
  options?: string[]; // Para campos tipo lista
}

export interface EmployeeChange {
  id: string;
  date: string;
  field: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
}

export interface EmployeeConfiguration {
  personalData: PersonalData;
  securitySocial: SecuritySocial;
  laborData: LaborData;
  employeeState: EmployeeState;
  customFields: CustomField[];
  changeHistory: EmployeeChange[];
}

export const ARL_RISK_PERCENTAGES = {
  'I': 0.00348,
  'II': 0.00435,
  'III': 0.00783,
  'IV': 0.01740,
  'V': 0.03480
};

export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PEP', label: 'PEP' }
];

export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'Otro', label: 'Otro' }
];

export const CIVIL_STATUS_OPTIONS = [
  { value: 'Soltero', label: 'Soltero/a' },
  { value: 'Casado', label: 'Casado/a' },
  { value: 'Unión Libre', label: 'Unión Libre' },
  { value: 'Divorciado', label: 'Divorciado/a' },
  { value: 'Viudo', label: 'Viudo/a' }
];

export const CONTRACT_TYPES = [
  { value: 'indefinido', label: 'Término Indefinido' },
  { value: 'fijo', label: 'Término Fijo' },
  { value: 'prestacion', label: 'Prestación de Servicios' },
  { value: 'obra', label: 'Obra o Labor' },
  { value: 'aprendiz', label: 'Aprendiz' }
];

export const AFFILIATE_TYPES = [
  { value: 'Dependiente', label: 'Dependiente' },
  { value: 'Independiente', label: 'Independiente' },
  { value: 'Extranjero', label: 'Extranjero' }
];

export const WORKDAY_TYPES = [
  { value: 'diurna', label: 'Diurna' },
  { value: 'nocturna', label: 'Nocturna' },
  { value: 'mixta', label: 'Mixta' }
];

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Licencia', label: 'Licencia' },
  { value: 'Retirado', label: 'Retirado' }
];

export const ARL_RISK_LEVELS = [
  { value: 'I', label: 'Nivel I (0.348%)', percentage: 0.00348 },
  { value: 'II', label: 'Nivel II (0.435%)', percentage: 0.00435 },
  { value: 'III', label: 'Nivel III (0.783%)', percentage: 0.00783 },
  { value: 'IV', label: 'Nivel IV (1.740%)', percentage: 0.01740 },
  { value: 'V', label: 'Nivel V (3.480%)', percentage: 0.03480 }
];

export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Texto corto' },
  { value: 'number', label: 'Número' },
  { value: 'list', label: 'Lista de opciones' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí/No' }
];
