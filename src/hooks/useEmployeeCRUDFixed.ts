
// ✅ DEPRECATED: This hook is deprecated in favor of useEmployeeSubmission (KISS refactor)
// Keep for backward compatibility but recommend using useEmployeeSubmission instead

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SecureEmployeeService } from '@/services/SecureEmployeeService';
import { Employee } from '@/types';
import { EmployeeUnified } from '@/types/employee-unified';

/**
 * @deprecated Use useEmployeeSubmission instead for better error handling and unified API
 */
export const useEmployeeCRUD = () => {
  const queryClient = useQueryClient();

  console.warn('⚠️ useEmployeeCRUD is deprecated. Use useEmployeeSubmission instead.');

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const unifiedData: Omit<EmployeeUnified, 'id'> = {
      ...employeeData,
      tipoDocumento: employeeData.tipoDocumento || 'CC',
      tipoSalario: employeeData.tipoSalario || 'mensual',
      tipoContrato: employeeData.tipoContrato || 'indefinido',
      periodicidadPago: employeeData.periodicidadPago || 'mensual',
      estado: employeeData.estado || 'activo',
      tipoJornada: employeeData.tipoJornada || 'completa',
      company_id: employeeData.empresaId,
      empresaId: employeeData.empresaId
    };

    const result = await SecureEmployeeService.createEmployee(unifiedData);
    
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
    
    return result;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const result = await SecureEmployeeService.updateEmployee(id, updates as Partial<EmployeeUnified>);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
    return result;
  };

  const deleteEmployee = async (id: string) => {
    const result = await SecureEmployeeService.deleteEmployee(id);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
    return result;
  };

  return {
    createEmployee,
    updateEmployee,
    deleteEmployee
  };
};
