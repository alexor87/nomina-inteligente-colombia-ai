
import { z } from 'zod';
import { EmployeeValidationEnhancedSchema } from '@/schemas/employeeValidationEnhanced';

// Use the enhanced validation schema as the source of truth
export const employeeFormSchema = EmployeeValidationEnhancedSchema;

export type EmployeeFormData = z.infer<typeof EmployeeValidationEnhancedSchema>;

// Legacy schemas for backward compatibility
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
