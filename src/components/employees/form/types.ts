
import { EmployeeUnified } from '@/types/employee-unified';

export interface EmployeeFormData extends Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> {
  // ✅ NUEVO: Agregar id para empleados existentes
  id?: string;
  
  // Campos personalizados dinámicos
  custom_fields: Record<string, any>;
  
  // ✅ CORREGIR: Mapear campos con nombres correctos
  centro_costos?: string;
  codigo_ciiu?: string;
}
