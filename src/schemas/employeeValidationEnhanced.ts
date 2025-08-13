
import { z } from 'zod';

// Helper functions for date validation
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

const isDateInPast = (dateString: string): boolean => {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const isDateInFuture = (dateString: string): boolean => {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};

const calculateAge = (birthDate: string): number => {
  if (!isValidDate(birthDate)) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Enhanced validation schema
export const EmployeeValidationEnhancedSchema = z.object({
  // ID field for editing
  id: z.string().optional(),
  
  // Personal Information - Required
  cedula: z.string()
    .min(1, 'El número de documento es requerido')
    .max(20, 'El número de documento no puede exceder 20 caracteres')
    .regex(/^[0-9]+$/, 'El número de documento solo puede contener números'),
  
  tipoDocumento: z.enum(['CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'PEP', 'PPT'], {
    errorMap: () => ({ message: 'Tipo de documento inválido' })
  }),
  
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras'),
  
  segundoNombre: z.string()
    .max(50, 'El segundo nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/, 'El segundo nombre solo puede contener letras')
    .optional()
    .or(z.literal('')),
  
  apellido: z.string()
    .min(1, 'El apellido es requerido')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras'),

  // Personal Information - Optional with validation
  email: z.string()
    .email('Email inválido')
    .max(100, 'El email no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('')),
  
  telefono: z.string()
    .max(15, 'El teléfono no puede exceder 15 caracteres')
    .regex(/^[0-9+\-\s]*$/, 'El teléfono solo puede contener números, espacios, + y -')
    .optional()
    .or(z.literal('')),
  
  sexo: z.enum(['M', 'F', 'O'], {
    errorMap: () => ({ message: 'Sexo inválido' })
  }).optional(),
  
  fechaNacimiento: z.string()
    .optional()
    .or(z.literal(''))
    .refine(
      (date) => !date || isValidDate(date),
      'Fecha de nacimiento inválida'
    )
    .refine(
      (date) => !date || isDateInPast(date),
      'La fecha de nacimiento no puede ser en el futuro'
    )
    .refine(
      (date) => !date || calculateAge(date) >= 14,
      'La edad mínima para trabajar es 14 años'
    )
    .refine(
      (date) => !date || calculateAge(date) <= 100,
      'La edad no puede ser mayor a 100 años'
    ),
  
  direccion: z.string().max(100, 'La dirección no puede exceder 100 caracteres').optional().or(z.literal('')),
  ciudad: z.string().max(50, 'La ciudad no puede exceder 50 caracteres').optional().or(z.literal('')),
  departamento: z.string().max(50, 'El departamento no puede exceder 50 caracteres').optional().or(z.literal('')),

  // Labor Information - Required
  salarioBase: z.number()
    .min(1300000, 'El salario base no puede ser menor al salario mínimo ($1,300,000)')
    .max(100000000, 'El salario base no puede exceder $100,000,000')
    .refine((val) => val > 0, 'El salario debe ser mayor a 0'),
  
  tipoContrato: z.enum(['indefinido', 'fijo', 'obra', 'aprendizaje'], {
    errorMap: () => ({ message: 'Tipo de contrato inválido' })
  }),
  
  fechaIngreso: z.string()
    .min(1, 'La fecha de ingreso es requerida')
    .refine(isValidDate, 'Fecha de ingreso inválida')
    .refine(
      (date) => !isDateInFuture(date),
      'La fecha de ingreso no puede ser en el futuro'
    ),
  
  periodicidadPago: z.enum(['quincenal', 'mensual'], {
    errorMap: () => ({ message: 'Periodicidad de pago inválida' })
  }),

  // Labor Information - Optional
  cargo: z.string().max(100, 'El cargo no puede exceder 100 caracteres').optional().or(z.literal('')),
  codigoCIIU: z.string()
    .max(20, 'El código CIIU no puede exceder 20 caracteres')
    .regex(/^[0-9]*$/, 'El código CIIU solo puede contener números')
    .optional()
    .or(z.literal('')),
  
  nivelRiesgoARL: z.enum(['1', '2', '3', '4', '5'], {
    errorMap: () => ({ message: 'Nivel de riesgo ARL inválido (debe ser 1-5)' })
  }).optional(),
  
  estado: z.enum(['activo', 'inactivo', 'vacaciones', 'incapacidad']).default('activo'),
  centroCostos: z.string().max(100, 'El centro de costos no puede exceder 100 caracteres').optional().or(z.literal('')),

  // Contract Details - Optional with conditional validation
  fechaFirmaContrato: z.string()
    .optional()
    .or(z.literal(''))
    .refine(
      (date) => !date || isValidDate(date),
      'Fecha de firma de contrato inválida'
    ),
  
  fechaFinalizacionContrato: z.string()
    .optional()
    .or(z.literal(''))
    .refine(
      (date) => !date || isValidDate(date),
      'Fecha de finalización de contrato inválida'
    ),
  
  tipoJornada: z.enum(['completa', 'parcial', 'horas']).default('completa'),
  
  diasTrabajo: z.number()
    .min(1, 'Los días de trabajo deben ser al menos 1')
    .max(31, 'Los días de trabajo no pueden exceder 31')
    .default(30),
  
  horasTrabajo: z.number()
    .min(1, 'Las horas de trabajo deben ser al menos 1')
    .max(12, 'Las horas de trabajo no pueden exceder 12 por día')
    .default(8),
  
  beneficiosExtralegales: z.boolean().default(false),
  clausulasEspeciales: z.string().max(500, 'Las cláusulas especiales no pueden exceder 500 caracteres').optional().or(z.literal('')),

  // Banking Information - Conditional validation
  banco: z.string().max(100, 'El nombre del banco no puede exceder 100 caracteres').optional().or(z.literal('')),
  tipoCuenta: z.enum(['ahorros', 'corriente']).default('ahorros'),
  numeroCuenta: z.string()
    .max(50, 'El número de cuenta no puede exceder 50 caracteres')
    .regex(/^[0-9\-]*$/, 'El número de cuenta solo puede contener números y guiones')
    .optional()
    .or(z.literal('')),
  titularCuenta: z.string().max(100, 'El titular de la cuenta no puede exceder 100 caracteres').optional().or(z.literal('')),
  formaPago: z.enum(['dispersion', 'manual']).default('dispersion'),

  // Affiliations - Optional
  eps: z.string().max(100, 'El nombre de la EPS no puede exceder 100 caracteres').optional().or(z.literal('')),
  afp: z.string().max(100, 'El nombre de la AFP no puede exceder 100 caracteres').optional().or(z.literal('')),
  arl: z.string().max(100, 'El nombre de la ARL no puede exceder 100 caracteres').optional().or(z.literal('')),
  cajaCompensacion: z.string().max(100, 'El nombre de la caja de compensación no puede exceder 100 caracteres').optional().or(z.literal('')),
  tipoCotizanteId: z.string().max(100, 'El tipo de cotizante no puede exceder 100 caracteres').optional().or(z.literal('')),
  subtipoCotizanteId: z.string().max(100, 'El subtipo de cotizante no puede exceder 100 caracteres').optional().or(z.literal('')),
  regimenSalud: z.enum(['contributivo', 'subsidiado']).default('contributivo'),
  estadoAfiliacion: z.enum(['completa', 'pendiente', 'inconsistente']).default('pendiente'),

  // Custom fields
  custom_fields: z.record(z.any()).optional(),
  customFields: z.record(z.any()).optional()
}).refine(
  (data) => {
    // Conditional validation: if formaPago is 'dispersion', banking info is required
    if (data.formaPago === 'dispersion') {
      return !!(data.banco && data.numeroCuenta && data.titularCuenta);
    }
    return true;
  },
  {
    message: 'Para forma de pago por dispersión se requiere banco, número de cuenta y titular',
    path: ['formaPago']
  }
).refine(
  (data) => {
    // Conditional validation: contract end date must be after start date
    if (data.fechaFirmaContrato && data.fechaFinalizacionContrato) {
      const startDate = new Date(data.fechaFirmaContrato);
      const endDate = new Date(data.fechaFinalizacionContrato);
      return endDate > startDate;
    }
    return true;
  },
  {
    message: 'La fecha de finalización debe ser posterior a la fecha de firma del contrato',
    path: ['fechaFinalizacionContrato']
  }
).refine(
  (data) => {
    // Fixed contracts require end date
    if (data.tipoContrato === 'fijo' && !data.fechaFinalizacionContrato) {
      return false;
    }
    return true;
  },
  {
    message: 'Los contratos de término fijo requieren fecha de finalización',
    path: ['fechaFinalizacionContrato']
  }
).refine(
  (data) => {
    // Part-time work validation
    if (data.tipoJornada === 'parcial' && data.horasTrabajo >= 8) {
      return false;
    }
    return true;
  },
  {
    message: 'La jornada parcial debe ser menor a 8 horas diarias',
    path: ['horasTrabajo']
  }
);

export type ValidatedEmployeeDataEnhanced = z.infer<typeof EmployeeValidationEnhancedSchema>;

// Validation helper functions
export const validateEmployeeDataEnhanced = (data: any): { success: boolean; data?: ValidatedEmployeeDataEnhanced; errors?: any } => {
  try {
    const validatedData = EmployeeValidationEnhancedSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { general: 'Error de validación desconocido' } };
  }
};

export const validatePartialEmployeeDataEnhanced = (data: any): { success: boolean; data?: Partial<ValidatedEmployeeDataEnhanced>; errors?: any } => {
  try {
    const validatedData = EmployeeValidationEnhancedSchema.partial().parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { general: 'Error de validación desconocido' } };
  }
};

// Age calculation helper for components
export const calculateEmployeeAge = calculateAge;
