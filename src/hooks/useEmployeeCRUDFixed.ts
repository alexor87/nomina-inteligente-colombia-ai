
import { useState } from 'react';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';

export const useEmployeeCRUDFixed = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      console.log('🚀 useEmployeeCRUDFixed: Creating employee with data:', employeeData);
      const data = await EmployeeUnifiedService.create(employeeData);

      console.log('✅ Employee created successfully:', data);

      toast({
        title: "Empleado creado",
        description: `${employeeData.nombre} ${employeeData.apellido} ha sido agregado exitosamente.`,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Error creating employee:', error);
      
      const errorMessage = error.message || "No se pudo crear el empleado. Intenta nuevamente.";
      
      toast({
        title: "Error al crear empleado",
        description: errorMessage,
        variant: "destructive"
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    setIsLoading(true);
    try {
      console.log('🔄 useEmployeeCRUDFixed: Updating employee with data:', { id, updates });
      
      if (!id) {
        throw new Error('ID de empleado es requerido para actualizar');
      }

      const result = await EmployeeUnifiedService.update(id, updates);
      console.log('🔄 useEmployeeCRUDFixed: Update result from service:', result);
      
      if (!result) {
        throw new Error('No se pudo confirmar que la actualización se guardó correctamente');
      }
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado han sido actualizados correctamente.",
      });

      console.log('✅ useEmployeeCRUDFixed: Employee updated successfully');
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ useEmployeeCRUDFixed: Error updating employee:', error);
      
      const errorMessage = error.message || "No se pudo actualizar el empleado.";
      
      toast({
        title: "Error al actualizar",
        description: errorMessage,
        variant: "destructive"
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    try {
      await EmployeeUnifiedService.delete(id);
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado del sistema.",
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error deleting employee:', error);
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
      console.log('🔄 Changing employee status:', { id, newStatus });
      
      const validStatuses = ['activo', 'inactivo', 'vacaciones', 'incapacidad'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Estado inválido: ${newStatus}. Estados válidos: ${validStatuses.join(', ')}`);
      }
      
      await EmployeeUnifiedService.changeStatus(id, newStatus as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad');
      
      toast({
        title: "Estado actualizado",
        description: `El estado del empleado ha sido cambiado a ${newStatus}.`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error changing employee status:', error);
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
