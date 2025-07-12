
import { useState, useCallback } from 'react';
import { EmployeeServiceRobust } from '@/services/EmployeeServiceRobust';
import { EmployeeUnified } from '@/types/employee-unified';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeCRUDState {
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  lastOperation: 'create' | 'update' | 'fetch' | null;
}

export const useEmployeeCRUDRobust = () => {
  const [state, setState] = useState<EmployeeCRUDState>({
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    error: null,
    lastOperation: null
  });

  const { toast } = useToast();

  const setLoading = useCallback((operation: 'create' | 'update' | 'fetch', loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
      isCreating: operation === 'create' ? loading : prev.isCreating,
      isUpdating: operation === 'update' ? loading : prev.isUpdating,
      lastOperation: loading ? operation : prev.lastOperation,
      error: loading ? null : prev.error
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
      isCreating: false,
      isUpdating: false
    }));
  }, []);

  const createEmployee = useCallback(async (formData: any): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> => {
    console.log('🚀 useEmployeeCRUDRobust: Starting employee creation');
    
    setLoading('create', true);

    try {
      const result = await EmployeeServiceRobust.createEmployee(formData);

      if (result.success && result.employee) {
        console.log('✅ Employee created successfully');
        
        toast({
          title: "Empleado creado",
          description: `${result.employee.nombre} ${result.employee.apellido} ha sido creado correctamente.`,
        });

        setLoading('create', false);
        return { success: true, data: result.employee };
      } else {
        console.error('❌ Employee creation failed:', result.error);
        
        const errorMessage = result.message || 'Error desconocido al crear empleado';
        setError(errorMessage);
        
        toast({
          title: "Error al crear empleado",
          description: errorMessage,
          variant: "destructive"
        });

        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('❌ Unexpected error in createEmployee hook:', error);
      
      const errorMessage = 'Error inesperado al crear empleado';
      setError(errorMessage);
      
      toast({
        title: "Error inesperado",
        description: errorMessage,
        variant: "destructive"
      });

      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError, toast]);

  const updateEmployee = useCallback(async (employeeId: string, formData: any): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> => {
    console.log('🔄 useEmployeeCRUDRobust: Starting employee update');
    
    setLoading('update', true);

    try {
      const result = await EmployeeServiceRobust.updateEmployee(employeeId, formData);

      if (result.success && result.employee) {
        console.log('✅ Employee updated successfully');
        
        toast({
          title: "Empleado actualizado",
          description: `${result.employee.nombre} ${result.employee.apellido} ha sido actualizado correctamente.`,
        });

        setLoading('update', false);
        return { success: true, data: result.employee };
      } else {
        console.error('❌ Employee update failed:', result.error);
        
        const errorMessage = result.message || 'Error desconocido al actualizar empleado';
        setError(errorMessage);
        
        toast({
          title: "Error al actualizar empleado",
          description: errorMessage,
          variant: "destructive"
        });

        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('❌ Unexpected error in updateEmployee hook:', error);
      
      const errorMessage = 'Error inesperado al actualizar empleado';
      setError(errorMessage);
      
      toast({
        title: "Error inesperado",
        description: errorMessage,
        variant: "destructive"
      });

      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError, toast]);

  const getEmployee = useCallback(async (employeeId: string): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> => {
    console.log('🔍 useEmployeeCRUDRobust: Fetching employee');
    
    setLoading('fetch', true);

    try {
      const employee = await EmployeeServiceRobust.getEmployeeById(employeeId);

      if (employee) {
        console.log('✅ Employee fetched successfully');
        setLoading('fetch', false);
        return { success: true, data: employee };
      } else {
        console.error('❌ Employee not found');
        
        const errorMessage = 'Empleado no encontrado';
        setError(errorMessage);
        
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('❌ Unexpected error in getEmployee hook:', error);
      
      const errorMessage = 'Error inesperado al obtener empleado';
      setError(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      error: null,
      lastOperation: null
    });
  }, []);

  return {
    // Operations
    createEmployee,
    updateEmployee,
    getEmployee,
    
    // State
    ...state,
    
    // Utilities
    clearError,
    resetState
  };
};
