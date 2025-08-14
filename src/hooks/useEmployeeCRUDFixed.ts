
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SecureEmployeeService } from '@/services/SecureEmployeeService';
import { Employee } from '@/types';
import { EmployeeUnified } from '@/types/employee-unified';

export const useEmployeeCRUD = () => {
  const queryClient = useQueryClient();

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await SecureEmployeeService.createEmployee({
      ...employeeData,
      tipoDocumento: employeeData.tipoDocumento || 'CC', // Ensure it's set
      tipoSalario: employeeData.tipoSalario || 'mensual', // Ensure it's set
      tipoContrato: employeeData.tipoContrato || 'indefinido', // Ensure it's set
      company_id: employeeData.empresaId
    });
    
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
