
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
  // Personal Info
  cedula: z.string().min(1, 'La cédula es requerida'),
  tipoDocumento: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  segundoNombre: z.string().optional(),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  sexo: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  departamento: z.string().optional(),
  
  // Labor Info
  cargo: z.string().optional(),
  salarioBase: z.number().min(0, 'El salario debe ser mayor a 0'),
  tipoContrato: z.string().optional(),
  fechaIngreso: z.string().min(1, 'La fecha de ingreso es requerida'),
  periodicidadPago: z.string().optional(),
  codigo_ciiu: z.string().optional(),
  nivelRiesgoARL: z.string().optional(),
  estado: z.string().optional(),
  centroCostos: z.string().optional(),
  fechaFirmaContrato: z.string().optional(),
  fechaFinalizacionContrato: z.string().optional(),
  tipoJornada: z.string().optional(),
  diasTrabajo: z.number().optional(),
  horasTrabajo: z.number().optional(),
  beneficiosExtralegales: z.boolean().optional(),
  clausulasEspeciales: z.string().optional(),
  
  // Banking Info
  banco: z.string().optional(),
  tipoCuenta: z.string().optional(),
  numeroCuenta: z.string().optional(),
  titularCuenta: z.string().optional(),
  formaPago: z.string().optional(),
  
  // Affiliations
  eps: z.string().optional(),
  afp: z.string().optional(),
  arl: z.string().optional(),
  cajaCompensacion: z.string().optional(),
  tipoCotizanteId: z.string().optional(),
  subtipoCotizanteId: z.string().optional(),
  regimenSalud: z.string().optional(),
  estadoAfiliacion: z.string().optional(),
  
  // Vacation fields
  initialVacationBalance: z.number().min(0, 'El balance inicial debe ser mayor o igual a 0').optional(),
  lastVacationCalculation: z.string().optional(),
  
  // Custom fields
  customFields: z.record(z.any()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
