
import { z } from 'zod';

// Custom validation functions
const noNumbersRegex = /^[^0-9]*$/;
const noSpacesRegex = /^\S*$/;
const numbersOnlyRegex = /^[0-9]*$/;

// Helper function to validate dates are not in the future
const notFutureDate = (date: string) => {
  if (!date) return true; // Allow empty dates for optional fields
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Set to end of today
  return inputDate <= today;
};

// Enhanced validation schemas with specific rules
export const personalInfoSchema = z.object({
  cedula: z.string().min(1, 'La cédula es requerida'),
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(30, 'El nombre no puede exceder 30 caracteres')
    .regex(noNumbersRegex, 'El nombre no puede contener números'),
  segundoNombre: z.string()
    .max(30, 'El segundo nombre no puede exceder 30 caracteres')
    .regex(noNumbersRegex, 'El segundo nombre no puede contener números')
    .or(z.literal('')),
  apellido: z.string()
    .min(1, 'El apellido es requerido')
    .max(30, 'El apellido no puede exceder 30 caracteres')
    .regex(noNumbersRegex, 'El apellido no puede contener números'),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  telefono: z.string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(numbersOnlyRegex, 'El teléfono solo puede contener números')
    .or(z.literal('')),
  fechaNacimiento: z.string()
    .refine((date) => notFutureDate(date), 'La fecha de nacimiento no puede ser futura')
    .optional(),
  direccion: z.string()
    .max(30, 'La dirección no puede exceder 30 caracteres')
    .optional(),
  avatar: z.string().optional(),
});

export const laborInfoSchema = z.object({
  cargo: z.string()
    .max(30, 'El cargo no puede exceder 30 caracteres')
    .optional(),
  salarioBase: z.number()
    .min(0, 'El salario base no puede ser negativo'),
  tipoContrato: z.string().optional(),
  fechaIngreso: z.string()
    .min(1, 'La fecha de ingreso es requerida')
    .refine((date) => notFutureDate(date), 'La fecha de ingreso no puede ser futura'),
  centroCostos: z.string()
    .max(20, 'El centro de costos no puede exceder 20 caracteres')
    .optional(),
  fechaFirmaContrato: z.string()
    .refine((date) => notFutureDate(date), 'La fecha de firma del contrato no puede ser futura')
    .optional(),
  arlRiskLevel: z.string().optional(),
});

export const affiliationsSchema = z.object({
  eps: z.string().optional(),
  afp: z.string().optional(),
  arl: z.string().optional(),
  cajaCompensacion: z.string().optional(),
});

export const bankingInfoSchema = z.object({
  banco: z.string().optional(),
  tipoCuenta: z.string().optional(),
  numeroCuenta: z.string()
    .max(20, 'El número de cuenta no puede exceder 20 caracteres')
    .regex(noSpacesRegex, 'El número de cuenta no puede contener espacios')
    .optional(),
});

// Main employee form schema with enhanced validation
export const employeeFormSchema = z.object({
  // ID field for editing
  id: z.string().optional(),
  
  // Personal Info with validation
  cedula: z.string().min(1, 'La cédula es requerida'),
  tipoDocumento: z.enum(['CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'PEP', 'PPT']).optional(),
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(30, 'El nombre no puede exceder 30 caracteres')
    .regex(noNumbersRegex, 'El nombre no puede contener números'),
  segundoNombre: z.string()
    .max(30, 'El segundo nombre no puede exceder 30 caracteres')
    .regex(noNumbersRegex, 'El segundo nombre no puede contener números')
    .or(z.literal('')),
  apellido: z.string()
    .min(1, 'El apellido es requerido')
    .max(30, 'El apellido no puede exceder 30 caracteres')
    .regex(noNumbersRegex, 'El apellido no puede contener números'),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  telefono: z.string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(numbersOnlyRegex, 'El teléfono solo puede contener números')
    .or(z.literal('')),
  sexo: z.enum(['M', 'F']).optional(),
  fechaNacimiento: z.string()
    .refine((date) => !date || notFutureDate(date), 'La fecha de nacimiento no puede ser futura')
    .optional(),
  direccion: z.string()
    .max(30, 'La dirección no puede exceder 30 caracteres')
    .optional(),
  ciudad: z.string().optional(),
  departamento: z.string().optional(),
  
  // Labor Info with validation
  cargo: z.string()
    .max(30, 'El cargo no puede exceder 30 caracteres')
    .optional(),
  salarioBase: z.number()
    .min(0, 'El salario base no puede ser negativo'),
  tipoContrato: z.enum(['indefinido', 'fijo', 'obra', 'aprendizaje']).optional(),
  fechaIngreso: z.string()
    .min(1, 'La fecha de ingreso es requerida')
    .refine((date) => notFutureDate(date), 'La fecha de ingreso no puede ser futura'),
  periodicidadPago: z.enum(['mensual', 'quincenal']).optional(),
  codigo_ciiu: z.string().optional(),
  nivelRiesgoARL: z.enum(['I', 'II', 'III', 'IV', 'V']).optional(),
  estado: z.enum(['activo', 'inactivo', 'vacaciones', 'incapacidad', 'eliminado']).optional(),
  centroCostos: z.string()
    .max(20, 'El centro de costos no puede exceder 20 caracteres')
    .optional(),
  fechaFirmaContrato: z.string()
    .refine((date) => !date || notFutureDate(date), 'La fecha de firma del contrato no puede ser futura')
    .optional(),
  fechaFinalizacionContrato: z.string().optional(),
  tipoJornada: z.enum(['completa', 'parcial', 'horas']).optional(),
  diasTrabajo: z.number().optional(),
  horasTrabajo: z.number().optional(),
  beneficiosExtralegales: z.boolean().optional(),
  clausulasEspeciales: z.string().optional(),
  
  // Banking Info with validation
  banco: z.string().optional(),
  tipoCuenta: z.enum(['ahorros', 'corriente']).optional(),
  numeroCuenta: z.string()
    .max(20, 'El número de cuenta no puede exceder 20 caracteres')
    .regex(noSpacesRegex, 'El número de cuenta no puede contener espacios')
    .optional(),
  titularCuenta: z.string()
    .max(50, 'El titular de la cuenta no puede exceder 50 caracteres')
    .optional(),
  formaPago: z.enum(['dispersion', 'manual']).optional(),
  
  // Affiliations
  eps: z.string().optional(),
  afp: z.string().optional(),
  arl: z.string().optional(),
  cajaCompensacion: z.string().optional(),
  tipoCotizanteId: z.string().optional(),
  subtipoCotizanteId: z.string().optional(),
  regimenSalud: z.enum(['contributivo', 'subsidiado']).optional(),
  estadoAfiliacion: z.enum(['completa', 'pendiente', 'inconsistente']).optional(),
  
  // Vacation fields with validation
  initialVacationBalance: z.number()
    .min(0, 'Los días de vacaciones no pueden ser negativos')
    .optional(),
  lastVacationCalculation: z.string()
    .refine((date) => !date || notFutureDate(date), 'La fecha de último cálculo no puede ser futura')
    .optional(),
  
  // Custom fields
  customFields: z.record(z.any()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
