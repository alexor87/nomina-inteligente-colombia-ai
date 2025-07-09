
import { EmployeeUnified } from '@/types/employee-unified';

export interface EmployeeFormData extends Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> {
  // ✅ NUEVO: Agregar id para empleados existentes
  id?: string;
  
  // Campos personalizados dinámicos
  custom_fields: Record<string, any>;
  
  // ✅ CORREGIR: Tipos actualizados para coincidir con Employee model
  centro_costos?: string;
  codigo_ciiu?: string;
  tipoContrato: "indefinido" | "fijo" | "obra" | "aprendizaje"; // ✅ FIXED: Match Employee
  estado: "activo" | "inactivo" | "vacaciones" | "incapacidad"; // ✅ FIXED: Remove 'licencia'
  periodicidadPago: "mensual" | "quincenal"; // ✅ FIXED: Remove 'semanal'
  tipoJornada: "completa" | "parcial" | "horas"; // ✅ FIXED: Match Employee
  formaPago: "dispersion" | "manual"; // ✅ FIXED: Match Employee
  estadoAfiliacion: "completa" | "pendiente" | "inconsistente"; // ✅ FIXED: Match Employee
  nivelRiesgoARL?: "I" | "II" | "III" | "IV" | "V"; // ✅ FIXED: Specific type
  sexo?: 'M' | 'F'; // ✅ FIXED: Remove 'O'
  regimenSalud: "contributivo" | "subsidiado";
}
