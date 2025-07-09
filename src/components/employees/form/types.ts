
import { EmployeeUnified } from '@/types/employee-unified';

export interface EmployeeFormData extends Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> {
  // Campos personalizados dinámicos
  custom_fields: Record<string, any>;
  
  // ✅ NUEVO: Campos para vacaciones iniciales (Fase 1)
  hasAccumulatedVacations: boolean;
  initialVacationDays: number;
}

export interface EmployeeFormSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isComplete: boolean;
}
