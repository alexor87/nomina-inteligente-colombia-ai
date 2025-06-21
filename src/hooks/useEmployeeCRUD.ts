
import { useState } from 'react';
import { Employee } from '@/types';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useToast } from '@/hooks/use-toast';

export const useEmployeeCRUD = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newEmployee: Employee = {
        ...employeeData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      toast({
        title: "Empleado creado",
        description: `${employeeData.nombre} ${employeeData.apellido} ha sido agregado exitosamente.`,
      });

      return { success: true, data: newEmployee };
    } catch (error) {
      toast({
        title: "Error al crear empleado",
        description: "No se pudo crear el empleado. Intenta nuevamente.",
        variant: "destructive"
      });
      return { success: false, error: "Error al crear empleado" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado han sido actualizados correctamente.",
      });

      return { success: true };
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el empleado.",
        variant: "destructive"
      });
      return { success: false, error: "Error al actualizar empleado" };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado del sistema.",
      });

      return { success: true };
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el empleado.",
        variant: "destructive"
      });
      return { success: false, error: "Error al eliminar empleado" };
    } finally {
      setIsLoading(false);
    }
  };

  const changeEmployeeStatus = async (id: string, newStatus: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Estado actualizado",
        description: `El estado del empleado ha sido cambiado a ${newStatus}.`,
      });

      return { success: true };
    } catch (error) {
      toast({
        title: "Error al cambiar estado",
        description: "No se pudo actualizar el estado del empleado.",
        variant: "destructive"
      });
      return { success: false, error: "Error al cambiar estado" };
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
