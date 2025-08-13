
import { z } from 'zod';

export const personalInfoSchema = z.object({
  cedula: z.string().min(1, 'La cédula es requerida'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  avatar: z.string().optional(),
});

export const laborInfoSchema = z.object({
  cargo: z.string().optional(),
  salarioBase: z.number().min(0, 'El salario debe ser mayor a 0'),
  tipoSalario: z.enum(['mensual', 'integral', 'medio_tiempo']).optional(), // ✅ NUEVO
  tipoContrato: z.string().optional(),
  fechaIngreso: z.string().min(1, 'La fecha de ingreso es requerida'),
  centroCostos: z.string().optional(),
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
  numeroCuenta: z.string().optional(),
});

export const employeeFormSchema = z.object({
  // ID field for editing
  id: z.string().optional(),
  
  // Personal Info
  cedula: z.string().min(1, 'La cédula es requerida'),
  tipoDocumento: z.enum(['CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'PEP', 'PPT']).optional(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  segundoNombre: z.string().optional(),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  sexo: z.enum(['M', 'F']).optional(),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  departamento: z.string().optional(),
  
  // Labor Info
  cargo: z.string().optional(),
  salarioBase: z.number().min(0, 'El salario debe ser mayor a 0'),
  tipoSalario: z.enum(['mensual', 'integral', 'medio_tiempo']).optional(), // ✅ NUEVO
  tipoContrato: z.enum(['indefinido', 'fijo', 'obra', 'aprendizaje']).optional(),
  fechaIngreso: z.string().min(1, 'La fecha de ingreso es requerida'),
  periodicidadPago: z.enum(['mensual', 'quincenal']).optional(),
  codigo_ciiu: z.string().optional(),
  nivelRiesgoARL: z.enum(['I', 'II', 'III', 'IV', 'V']).optional(),
  estado: z.enum(['activo', 'inactivo', 'vacaciones', 'incapacidad', 'eliminado']).optional(),
  centroCostos: z.string().optional(),
  fechaFirmaContrato: z.string().optional(),
  fechaFinalizacionContrato: z.string().optional(),
  tipoJornada: z.enum(['completa', 'parcial', 'horas']).optional(),
  diasTrabajo: z.number().optional(),
  horasTrabajo: z.number().optional(),
  beneficiosExtralegales: z.boolean().optional(),
  clausulasEspeciales: z.string().optional(),
  
  // Banking Info
  banco: z.string().optional(),
  tipoCuenta: z.enum(['ahorros', 'corriente']).optional(),
  numeroCuenta: z.string().optional(),
  titularCuenta: z.string().optional(),
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
  
  // Vacation fields
  initialVacationBalance: z.number().min(0, 'El balance inicial debe ser mayor o igual a 0').optional(),
  lastVacationCalculation: z.string().optional(),
  
  // Custom fields
  customFields: z.record(z.any()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
