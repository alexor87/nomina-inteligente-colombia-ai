
import { z } from 'zod';

export const EmployeeValidationSchema = z.object({
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
  
  apellido: z.string()
    .min(1, 'El apellido es requerido')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras'),

  // Personal Information - Optional
  segundoNombre: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().max(15).optional().or(z.literal('')),
  sexo: z.enum(['M', 'F', 'O']).optional(),
  fechaNacimiento: z.string().optional().or(z.literal('')),
  direccion: z.string().max(100).optional().or(z.literal('')),
  ciudad: z.string().max(50).optional().or(z.literal('')),
  departamento: z.string().max(50).optional().or(z.literal('')),

  // Labor Information - Required
  salarioBase: z.number()
    .min(1300000, 'El salario base no puede ser menor al salario mínimo')
    .max(100000000, 'El salario base no puede exceder $100,000,000'),
  
  tipoContrato: z.enum(['indefinido', 'fijo', 'obra', 'aprendizaje'], {
    errorMap: () => ({ message: 'Tipo de contrato inválido' })
  }),
  
  fechaIngreso: z.string().min(1, 'La fecha de ingreso es requerida'),
  
  periodicidadPago: z.enum(['quincenal', 'mensual'], {
    errorMap: () => ({ message: 'Periodicidad de pago inválida' })
  }),

  // Labor Information - Optional
  cargo: z.string().max(100).optional().or(z.literal('')),
  codigoCIIU: z.string().max(20).optional().or(z.literal('')),
  nivelRiesgoARL: z.enum(['I', 'II', 'III', 'IV', 'V']).optional(),
  estado: z.enum(['activo', 'inactivo', 'vacaciones', 'incapacidad']).default('activo'),
  centroCostos: z.string().max(100).optional().or(z.literal('')),

  // Contract Details - Optional
  fechaFirmaContrato: z.string().optional().or(z.literal('')),
  fechaFinalizacionContrato: z.string().optional().or(z.literal('')),
  tipoJornada: z.enum(['completa', 'parcial', 'horas']).default('completa'),
  diasTrabajo: z.number().min(1).max(31).default(30),
  horasTrabajo: z.number().min(1).max(12).default(8),
  beneficiosExtralegales: z.boolean().default(false),
  clausulasEspeciales: z.string().max(500).optional().or(z.literal('')),

  // Banking Information - Optional but validated if provided
  banco: z.string().max(100).optional().or(z.literal('')),
  tipoCuenta: z.enum(['ahorros', 'corriente']).default('ahorros'),
  numeroCuenta: z.string().max(50).optional().or(z.literal('')),
  titularCuenta: z.string().max(100).optional().or(z.literal('')),
  formaPago: z.enum(['dispersion', 'manual']).default('dispersion'),

  // Affiliations - Optional
  eps: z.string().max(100).optional().or(z.literal('')),
  afp: z.string().max(100).optional().or(z.literal('')),
  arl: z.string().max(100).optional().or(z.literal('')),
  cajaCompensacion: z.string().max(100).optional().or(z.literal('')),
  tipoCotizanteId: z.string().max(100).optional().or(z.literal('')),
  subtipoCotizanteId: z.string().max(100).optional().or(z.literal('')),
  regimenSalud: z.enum(['contributivo', 'subsidiado']).default('contributivo'),
  estadoAfiliacion: z.enum(['completa', 'pendiente', 'inconsistente']).default('pendiente')
});

export type ValidatedEmployeeData = z.infer<typeof EmployeeValidationSchema>;

// Validation helper functions
export const validateEmployeeData = (data: any): { success: boolean; data?: ValidatedEmployeeData; errors?: any } => {
  try {
    const validatedData = EmployeeValidationSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { general: 'Error de validación desconocido' } };
  }
};

export const validatePartialEmployeeData = (data: any): { success: boolean; data?: Partial<ValidatedEmployeeData>; errors?: any } => {
  try {
    const validatedData = EmployeeValidationSchema.partial().parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { general: 'Error de validación desconocido' } };
  }
};
