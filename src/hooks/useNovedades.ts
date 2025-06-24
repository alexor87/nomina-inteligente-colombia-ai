
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
      const employeeNovedades = await NovedadesService.getNovedadesByEmployee(empleadoId, periodoId);
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

  const createNovedad = useCallback(async (novedadData: CreateNovedadData) => {
    try {
      setIsLoading(true);
      const newNovedad = await NovedadesService.createNovedad(novedadData);
      
      if (newNovedad) {
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

        // Trigger recalculation of payroll after novedad creation
        if (onNovedadChange) {
          onNovedadChange();
        }

        return newNovedad;
      }
    } catch (error) {
      console.error('Error creating novedad:', error);
      toast({
        title: "Error al crear novedad",
        description: "No se pudo registrar la novedad",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, onNovedadChange]);

  const updateNovedad = useCallback(async (id: string, updates: Partial<CreateNovedadData>, empleadoId: string) => {
    try {
      setIsLoading(true);
      const updatedNovedad = await NovedadesService.updateNovedad(id, updates);
      
      if (updatedNovedad) {
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

        // Trigger recalculation of payroll after novedad update
        if (onNovedadChange) {
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

  const deleteNovedad = useCallback(async (id: string, empleadoId: string) => {
    try {
      setIsLoading(true);
      await NovedadesService.deleteNovedad(id);
      
      setNovedades(prev => ({
        ...prev,
        [empleadoId]: (prev[empleadoId] || []).filter(novedad => novedad.id !== id)
      }));

      toast({
        title: "Novedad eliminada",
        description: "La novedad se ha eliminado correctamente"
      });

      // Trigger recalculation of payroll after novedad deletion
      if (onNovedadChange) {
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
    return novedades[empleadoId]?.length || 0;
  }, [novedades]);

  const getEmployeeNovedades = useCallback((empleadoId: string): PayrollNovedad[] => {
    return novedades[empleadoId] || [];
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
