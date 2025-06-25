import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesService } from '@/services/NovedadesService';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades';

export const useNovedades = (periodoId: string, onNovedadChange?: () => void) => {
  const { toast } = useToast();
  const [novedades, setNovedades] = useState<Record<string, PayrollNovedad[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadNovedadesForEmployee = useCallback(async (empleadoId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading novedades for employee:', empleadoId, 'periodo:', periodoId);
      const employeeNovedades = await NovedadesService.getNovedadesByEmployee(empleadoId, periodoId);
      console.log('Loaded novedades:', employeeNovedades);
      
      setNovedades(prev => ({
        ...prev,
        [empleadoId]: employeeNovedades
      }));
    } catch (error) {
      console.error('Error loading novedades:', error);
      toast({
        title: "Error al cargar novedades",
        description: "No se pudieron cargar las novedades del empleado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodoId, toast]);

  const createNovedad = useCallback(async (novedadData: CreateNovedadData, skipRecalculation = false) => {
    try {
      setIsLoading(true);
      console.log('📝 Iniciando creación de novedad con datos:', novedadData);
      
      // Validaciones adicionales antes de enviar
      if (!novedadData.empleado_id) {
        throw new Error('ID del empleado es requerido');
      }
      if (!periodoId) {
        throw new Error('ID del período es requerido');
      }
      if (!novedadData.tipo_novedad) {
        throw new Error('Tipo de novedad es requerido');
      }
      if (!novedadData.valor || novedadData.valor <= 0) {
        throw new Error('El valor debe ser mayor a 0');
      }

      // Agregar periodo_id a los datos
      const completeData = {
        ...novedadData,
        periodo_id: periodoId
      };

      console.log('📤 Datos completos para envío:', completeData);
      
      const newNovedad = await NovedadesService.createNovedad(completeData);
      console.log('✅ Novedad creada exitosamente:', newNovedad);
      
      if (newNovedad) {
        // Update local state immediately
        setNovedades(prev => ({
          ...prev,
          [novedadData.empleado_id]: [
            newNovedad,
            ...(prev[novedadData.empleado_id] || [])
          ]
        }));

        toast({
          title: "Novedad registrada",
          description: "La novedad se ha registrado correctamente"
        });

        // Only trigger recalculation if not skipped
        if (!skipRecalculation && onNovedadChange) {
          console.log('🔄 Activando recalculación de nómina');
          onNovedadChange();
        }

        return newNovedad;
      }
    } catch (error) {
      console.error('❌ Error completo creating novedad:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: "Error al crear novedad",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, onNovedadChange, periodoId]);

  const updateNovedad = useCallback(async (id: string, updates: Partial<CreateNovedadData>, empleadoId: string, skipRecalculation = false) => {
    try {
      setIsLoading(true);
      console.log('Updating novedad:', id, 'with updates:', updates);
      
      const updatedNovedad = await NovedadesService.updateNovedad(id, updates);
      console.log('Updated novedad:', updatedNovedad);
      
      if (updatedNovedad) {
        // Update local state immediately
        setNovedades(prev => ({
          ...prev,
          [empleadoId]: (prev[empleadoId] || []).map(novedad =>
            novedad.id === id ? updatedNovedad : novedad
          )
        }));

        toast({
          title: "Novedad actualizada",
          description: "La novedad se ha actualizado correctamente"
        });

        // Only trigger recalculation if not skipped
        if (!skipRecalculation && onNovedadChange) {
          console.log('Triggering payroll recalculation after novedad update');
          onNovedadChange();
        }
      }
    } catch (error) {
      console.error('Error updating novedad:', error);
      toast({
        title: "Error al actualizar novedad",
        description: "No se pudo actualizar la novedad",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, onNovedadChange]);

  const deleteNovedad = useCallback(async (id: string, empleadoId: string, skipRecalculation = false) => {
    try {
      setIsLoading(true);
      console.log('Deleting novedad:', id);
      
      await NovedadesService.deleteNovedad(id);
      
      // Update local state immediately
      setNovedades(prev => ({
        ...prev,
        [empleadoId]: (prev[empleadoId] || []).filter(novedad => novedad.id !== id)
      }));

      toast({
        title: "Novedad eliminada",
        description: "La novedad se ha eliminado correctamente"
      });

      // Only trigger recalculation if not skipped
      if (!skipRecalculation && onNovedadChange) {
        console.log('Triggering payroll recalculation after novedad deletion');
        onNovedadChange();
      }
    } catch (error) {
      console.error('Error deleting novedad:', error);
      toast({
        title: "Error al eliminar novedad",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, onNovedadChange]);

  const getEmployeeNovedadesCount = useCallback((empleadoId: string): number => {
    const count = novedades[empleadoId]?.length || 0;
    console.log('Getting novedades count for employee', empleadoId, ':', count);
    return count;
  }, [novedades]);

  const getEmployeeNovedades = useCallback((empleadoId: string): PayrollNovedad[] => {
    const employeeNovedades = novedades[empleadoId] || [];
    console.log('Getting novedades for employee', empleadoId, ':', employeeNovedades);
    return employeeNovedades;
  }, [novedades]);

  return {
    novedades,
    isLoading,
    loadNovedadesForEmployee,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    getEmployeeNovedadesCount,
    getEmployeeNovedades
  };
};
