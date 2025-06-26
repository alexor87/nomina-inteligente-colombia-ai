
export interface EmployeeFieldMappingConfig {
  key: string;
  label: string;
  isRequired: boolean;
  type: 'text' | 'number' | 'date' | 'email' | 'select';
  options?: { value: string; label: string }[];
  description?: string;
}

export const EMPLOYEE_FIELD_MAPPINGS: EmployeeFieldMappingConfig[] = [
  // Información básica
  {
    key: 'cedula',
    label: 'Número de Documento',
    isRequired: true,
    type: 'text',
    description: 'Número de identificación del empleado'
  },
  {
    key: 'tipoDocumento',
    label: 'Tipo de Documento',
    isRequired: false,
    type: 'select',
    options: [
      { value: 'CC', label: 'Cédula de Ciudadanía' },
      { value: 'TI', label: 'Tarjeta de Identidad' },
      { value: 'CE', label: 'Cédula de Extranjería' },
      { value: 'PA', label: 'Pasaporte' },
      { value: 'RC', label: 'Registro Civil' },
      { value: 'NIT', label: 'NIT' },
      { value: 'PEP', label: 'PEP' },
      { value: 'PPT', label: 'PPT' }
    ],
    description: 'Tipo de documento de identificación'
  },
  {
    key: 'nombre',
    label: 'Primer Nombre',
    isRequired: true,
    type: 'text',
    description: 'Primer nombre del empleado'
  },
  {
    key: 'segundoNombre',
    label: 'Segundo Nombre',
    isRequired: false,
    type: 'text',
    description: 'Segundo nombre del empleado (opcional)'
  },
  {
    key: 'apellido',
    label: 'Apellidos',
    isRequired: true,
    type: 'text',
    description: 'Apellidos del empleado'
  },
  {
    key: 'email',
    label: 'Email',
    isRequired: false,
    type: 'email',
    description: 'Correo electrónico del empleado'
  },
  {
    key: 'telefono',
    label: 'Teléfono',
    isRequired: false,
    type: 'text',
    description: 'Número de teléfono del empleado'
  },
  
  // Información laboral
  {
    key: 'cargo',
    label: 'Cargo',
    isRequired: false,
    type: 'text',
    description: 'Cargo o posición del empleado'
  },
  {
    key: 'salarioBase',
    label: 'Salario Base',
    isRequired: true,
    type: 'number',
    description: 'Salario base mensual del empleado'
  },
  {
    key: 'tipoContrato',
    label: 'Tipo de Contrato',
    isRequired: false,
    type: 'select',
    options: [
      { value: 'indefinido', label: 'Indefinido' },
      { value: 'fijo', label: 'Término Fijo' },
      { value: 'obra', label: 'Obra o Labor' },
      { value: 'aprendizaje', label: 'Aprendizaje' }
    ],
    description: 'Tipo de contrato laboral'
  },
  {
    key: 'fechaIngreso',
    label: 'Fecha de Ingreso',
    isRequired: false,
    type: 'date',
    description: 'Fecha de ingreso a la empresa (YYYY-MM-DD)'
  },
  {
    key: 'estado',
    label: 'Estado',
    isRequired: false,
    type: 'select',
    options: [
      { value: 'activo', label: 'Activo' },
      { value: 'inactivo', label: 'Inactivo' },
      { value: 'vacaciones', label: 'Vacaciones' },
      { value: 'incapacidad', label: 'Incapacidad' }
    ],
    description: 'Estado actual del empleado'
  },
  
  // Seguridad social
  {
    key: 'eps',
    label: 'EPS',
    isRequired: false,
    type: 'text',
    description: 'Entidad Promotora de Salud'
  },
  {
    key: 'afp',
    label: 'AFP',
    isRequired: false,
    type: 'text',
    description: 'Administradora de Fondo de Pensiones'
  },
  {
    key: 'arl',
    label: 'ARL',
    isRequired: false,
    type: 'text',
    description: 'Administradora de Riesgos Laborales'
  },
  {
    key: 'cajaCompensacion',
    label: 'Caja de Compensación',
    isRequired: false,
    type: 'text',
    description: 'Caja de Compensación Familiar'
  },
  {
    key: 'nivelRiesgoARL',
    label: 'Nivel de Riesgo ARL',
    isRequired: false,
    type: 'select',
    options: [
      { value: 'I', label: 'Nivel I' },
      { value: 'II', label: 'Nivel II' },
      { value: 'III', label: 'Nivel III' },
      { value: 'IV', label: 'Nivel IV' },
      { value: 'V', label: 'Nivel V' }
    ],
    description: 'Nivel de riesgo para ARL'
  },
  {
    key: 'estadoAfiliacion',
    label: 'Estado de Afiliación',
    isRequired: false,
    type: 'select',
    options: [
      { value: 'completa', label: 'Completa' },
      { value: 'pendiente', label: 'Pendiente' },
      { value: 'inconsistente', label: 'Inconsistente' }
    ],
    description: 'Estado de las afiliaciones a seguridad social'
  },
  
  // Información bancaria
  {
    key: 'banco',
    label: 'Banco',
    isRequired: false,
    type: 'text',
    description: 'Entidad bancaria para pagos'
  },
  {
    key: 'tipoCuenta',
    label: 'Tipo de Cuenta',
    isRequired: false,
    type: 'select',
    options: [
      { value: 'ahorros', label: 'Ahorros' },
      { value: 'corriente', label: 'Corriente' }
    ],
    description: 'Tipo de cuenta bancaria'
  },
  {
    key: 'numeroCuenta',
    label: 'Número de Cuenta',
    isRequired: false,
    type: 'text',
    description: 'Número de cuenta bancaria'
  },
  {
    key: 'titularCuenta',
    label: 'Titular de la Cuenta',
    isRequired: false,
    type: 'text',
    description: 'Nombre del titular de la cuenta bancaria'
  },
  
  // Tipos de cotizante
  {
    key: 'tipoCotizanteId',
    label: 'Tipo de Cotizante',
    isRequired: false,
    type: 'text',
    description: 'ID del tipo de cotizante en PILA'
  },
  {
    key: 'subtipoCotizanteId',
    label: 'Subtipo de Cotizante',
    isRequired: false,
    type: 'text',
    description: 'ID del subtipo de cotizante en PILA'
  }
];

export const getRequiredFields = (): EmployeeFieldMappingConfig[] => {
  return EMPLOYEE_FIELD_MAPPINGS.filter(field => field.isRequired);
};

export const getOptionalFields = (): EmployeeFieldMappingConfig[] => {
  return EMPLOYEE_FIELD_MAPPINGS.filter(field => !field.isRequired);
};

export const getFieldByKey = (key: string): EmployeeFieldMappingConfig | undefined => {
  return EMPLOYEE_FIELD_MAPPINGS.find(field => field.key === key);
};
