
import { useState } from 'react';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { EmployeeService } from '@/services/EmployeeService';

export const useEmployeeCRUD = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      const data = await EmployeeService.create(employeeData);

      toast({
        title: "Empleado creado",
        description: `${employeeData.nombre} ${employeeData.apellido} ha sido agregado exitosamente.`,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: "Error al crear empleado",
        description: error.message || "No se pudo crear el empleado. Intenta nuevamente.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    setIsLoading(true);
    try {
      await EmployeeService.update(id, updates);
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado han sido actualizados correctamente.",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar el empleado.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    try {
      await EmployeeService.delete(id);
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado del sistema.",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el empleado.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const changeEmployeeStatus = async (id: string, newStatus: string) => {
    setIsLoading(true);
    try {
      await EmployeeService.changeStatus(id, newStatus);
      
      toast({
        title: "Estado actualizado",
        description: `El estado del empleado ha sido cambiado a ${newStatus}.`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error changing employee status:', error);
      toast({
        title: "Error al cambiar estado",
        description: error.message || "No se pudo actualizar el estado del empleado.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    changeEmployeeStatus,
    isLoading
  };
};
