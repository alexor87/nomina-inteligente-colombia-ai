
import { EmployeeUnified } from '@/types/employee-unified';

// ✅ SIMPLIFIED: Direct interface without confusion
export interface EmployeeFormData {
  // Basic required fields
  id?: string;
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: 'M' | 'F'; // ✅ SIMPLIFIED: Removed 'O'
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Labor Information
  salarioBase: number;
  tipoContrato: "indefinido" | "fijo" | "obra" | "aprendizaje";
  fechaIngreso: string;
  periodicidadPago: "mensual" | "quincenal";
  cargo?: string;
  codigo_ciiu?: string;
  nivelRiesgoARL?: "I" | "II" | "III" | "IV" | "V";
  estado: "activo" | "inactivo" | "vacaciones" | "incapacidad" | "eliminado"; // ✅ FIXED: Added 'eliminado'
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: "completa" | "parcial" | "horas"; // ✅ REQUIRED
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  
  // Banking Information
  banco?: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago: "dispersion" | "manual";
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud: "contributivo" | "subsidiado";
  estadoAfiliacion: "completa" | "pendiente" | "inconsistente";
  
  // Custom fields
  custom_fields?: Record<string, any>;
}
