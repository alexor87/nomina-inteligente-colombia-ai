
import { useState } from 'react';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { EmployeeService } from '@/services/EmployeeService';
import { EmployeeStatusService } from '@/services/EmployeeStatusService';

export const useEmployeeCRUD = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      console.log('🚀 useEmployeeCRUD: Creating employee with data:', employeeData);
      const data = await EmployeeService.create(employeeData);

      console.log('✅ Employee created successfully:', data);

      toast({
        title: "Empleado creado",
        description: `${employeeData.nombre} ${employeeData.apellido} ha sido agregado exitosamente.`,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Error creating employee:', error);
      
      // Mostrar error específico al usuario
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
      console.log('🔄 useEmployeeCRUD: Updating employee with data:', { id, updates });
      
      if (!id) {
        throw new Error('ID de empleado es requerido para actualizar');
      }

      const result = await EmployeeService.update(id, updates);
      console.log('🔄 useEmployeeCRUD: Update result from service:', result);
      
      // Verificar que la actualización fue exitosa
      if (!result || (Array.isArray(result) && result.length === 0)) {
        throw new Error('No se pudo confirmar que la actualización se guardó correctamente');
      }
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado han sido actualizados correctamente.",
      });

      console.log('✅ useEmployeeCRUD: Employee updated successfully');
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ useEmployeeCRUD: Error updating employee:', error);
      
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
      console.log('Changing employee status:', { id, newStatus });
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

  const updateCentroCosto = async (id: string, centroCosto: string) => {
    setIsLoading(true);
    try {
      await EmployeeStatusService.updateCentroCosto(id, centroCosto);
      
      toast({
        title: "Centro de costo actualizado",
        description: "Se ha actualizado el centro de costo del empleado.",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating centro costo:', error);
      toast({
        title: "Error al actualizar centro de costo",
        description: error.message || "No se pudo actualizar el centro de costo.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateNivelRiesgoARL = async (id: string, nivelRiesgo: 'I' | 'II' | 'III' | 'IV' | 'V') => {
    setIsLoading(true);
    try {
      await EmployeeStatusService.updateNivelRiesgoARL(id, nivelRiesgo);
      
      toast({
        title: "Nivel de riesgo ARL actualizado",
        description: "Se ha actualizado el nivel de riesgo ARL del empleado.",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating ARL risk level:', error);
      toast({
        title: "Error al actualizar nivel de riesgo",
        description: error.message || "No se pudo actualizar el nivel de riesgo ARL.",
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
    updateCentroCosto,
    updateNivelRiesgoARL,
    isLoading
  };
};
