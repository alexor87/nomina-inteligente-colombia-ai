
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { EmployeeUnified } from '@/types/employee-unified';

export const useEmployeeCRUD = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createEmployee = async (employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setIsCreating(true);
    try {
      console.log('🔄 useEmployeeCRUD: Creating employee with data:', employeeData);
      
      const result = await EmployeeUnifiedService.create(employeeData);

      if (result.success) {
        console.log('✅ useEmployeeCRUD: Employee created successfully');
        
        toast({
          title: "Empleado creado",
          description: "El empleado se ha creado correctamente",
          className: "border-green-200 bg-green-50"
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employee-statistics'] });
        
        return { success: true, data: result.data };
      } else {
        console.error('❌ useEmployeeCRUD: Error creating employee:', result.error);
        
        toast({
          title: "Error al crear empleado",
          description: result.error || "No se pudo crear el empleado",
          variant: "destructive"
        });
        
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('❌ useEmployeeCRUD: Exception in createEmployee:', error);
      
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado al crear el empleado",
        variant: "destructive"
      });
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
      setIsCreating(false);
    }
  };

  const updateEmployee = async (id: string, employeeData: Partial<EmployeeUnified>) => {
    setIsLoading(true);
    setIsUpdating(true);
    try {
      console.log('🔄 useEmployeeCRUD: Updating employee with ID:', id);
      
      const result = await EmployeeUnifiedService.update(id, employeeData);

      if (result.success) {
        console.log('✅ useEmployeeCRUD: Employee updated successfully');
        
        toast({
          title: "Empleado actualizado",
          description: "Los datos del empleado se han actualizado correctamente",
          className: "border-green-200 bg-green-50"
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employee', id] });
        queryClient.invalidateQueries({ queryKey: ['employee-statistics'] });
        
        return { success: true, data: result.data };
      } else {
        console.error('❌ useEmployeeCRUD: Error updating employee:', result.error);
        
        toast({
          title: "Error al actualizar empleado",
          description: result.error || "No se pudo actualizar el empleado",
          variant: "destructive"
        });
        
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('❌ useEmployeeCRUD: Exception in updateEmployee:', error);
      
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado al actualizar el empleado",
        variant: "destructive"
      });
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    try {
      console.log('🔄 useEmployeeCRUD: Deleting employee with ID:', id);
      
      const result = await EmployeeUnifiedService.delete(id);

      if (result.success) {
        console.log('✅ useEmployeeCRUD: Employee deleted successfully');
        
        toast({
          title: "Empleado eliminado",
          description: "El empleado se ha eliminado correctamente",
          className: "border-green-200 bg-green-50"
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employee-statistics'] });
        
        return { success: true };
      } else {
        console.error('❌ useEmployeeCRUD: Error deleting employee:', result.error);
        
        toast({
          title: "Error al eliminar empleado",
          description: result.error || "No se pudo eliminar el empleado",
          variant: "destructive"
        });
        
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('❌ useEmployeeCRUD: Exception in deleteEmployee:', error);
      
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado al eliminar el empleado",
        variant: "destructive"
      });
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const changeEmployeeStatus = async (id: string, newStatus: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad') => {
    setIsLoading(true);
    try {
      console.log('🔄 useEmployeeCRUD: Changing employee status:', id, 'to', newStatus);
      
      const result = await EmployeeUnifiedService.changeStatus(id, newStatus);

      if (result.success) {
        console.log('✅ useEmployeeCRUD: Employee status changed successfully');
        
        toast({
          title: "Estado actualizado",
          description: "El estado del empleado se ha actualizado correctamente",
          className: "border-green-200 bg-green-50"
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employee', id] });
        queryClient.invalidateQueries({ queryKey: ['employee-statistics'] });
        
        return { success: true };
      } else {
        console.error('❌ useEmployeeCRUD: Error changing employee status:', result.error);
        
        toast({
          title: "Error al cambiar estado",
          description: result.error || "No se pudo cambiar el estado del empleado",
          variant: "destructive"
        });
        
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('❌ useEmployeeCRUD: Exception in changeEmployeeStatus:', error);
      
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado al cambiar el estado del empleado",
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
    isLoading,
    isCreating,
    isUpdating
  };
};
