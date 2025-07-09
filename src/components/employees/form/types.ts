
import { EmployeeUnified } from '@/types/employee-unified';

export interface EmployeeFormData extends Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> {
  // ✅ NUEVO: Agregar id para empleados existentes
  id?: string;
  
  // Campos personalizados dinámicos
  custom_fields: Record<string, any>;
  
  // ✅ CORREGIR: Tipos actualizados para coincidir con los valores del UI
  centro_costos?: string;
  codigo_ciiu?: string;
  tipoContrato: "indefinido" | "fijo" | "obra_labor" | "aprendizaje" | "practicas";
  estado: "activo" | "inactivo" | "vacaciones" | "incapacidad" | "licencia";
  periodicidadPago: "mensual" | "quincenal" | "semanal";
  tipoJornada: "completa" | "medio_tiempo" | "por_horas" | "flexible";
}
