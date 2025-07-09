
import { EmployeeUnified } from '@/types/employee-unified';

export interface EmployeeFormData extends Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> {
  // ✅ NUEVO: Agregar id para empleados existentes
  id?: string;
  
  // Campos personalizados dinámicos
  custom_fields: Record<string, any>;
}

export interface EmployeeFormSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isComplete: boolean;
}
