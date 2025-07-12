
import { EmployeeUnified } from '@/types/employee-unified';

// ✅ FIXED: Updated interface with proper type definitions that match EmployeeUnified
export interface EmployeeFormData {
  // Basic required fields
  id?: string;
  cedula: string;
  tipoDocumento: string; // ✅ FIXED: Changed to string to accept any value
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: string; // ✅ FIXED: Changed to string to accept any value
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Labor Information
  salarioBase: number;
  tipoContrato: string; // ✅ FIXED: Changed to string
  fechaIngreso: string;
  periodicidadPago: string; // ✅ FIXED: Changed to string
  cargo?: string;
  codigoCiiu?: string; // ✅ FIXED: Changed property name to match EmployeeUnified
  nivelRiesgoArl?: string; // ✅ FIXED: Changed property name to match EmployeeUnified
  estado: string; // ✅ FIXED: Changed to string to accept 'eliminado'
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: string; // ✅ FIXED: Changed to string
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  
  // Banking Information
  banco?: string;
  tipoCuenta: string; // ✅ FIXED: Changed to string
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago: string; // ✅ FIXED: Changed to string
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud: string; // ✅ FIXED: Changed to string
  estadoAfiliacion: string; // ✅ FIXED: Changed to string
  
  // Custom fields
  customFields?: Record<string, any>; // ✅ FIXED: Changed property name to match EmployeeUnified
}
