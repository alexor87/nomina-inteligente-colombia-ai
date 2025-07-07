
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesCalculationService, NovedadesTotals } from '@/services/NovedadesCalculationService';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';

export const usePayrollNovedadesUnified = (periodId: string) => {
  const [novedadesTotals, setNovedadesTotals] = useState<Record<string, NovedadesTotals>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const { toast } = useToast();

  // Cargar totales de novedades para empleados específicos
  const loadNovedadesTotals = useCallback(async (employeeIds: string[]) => {
    if (!periodId || employeeIds.length === 0) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Cargando totales de novedades para empleados:', employeeIds, 'período:', periodId);
      const totals = await NovedadesCalculationService.calculateAllEmployeesNovedadesTotals(employeeIds, periodId);
      setNovedadesTotals(totals);
      console.log('✅ Totales de novedades cargados:', totals);
    } catch (error) {
      console.error('❌ Error cargando totales de novedades:', error);
      setNovedadesTotals({});
    } finally {
      setIsLoading(false);
    }
  }, [periodId]);

  // Crear nueva novedad
  const createNovedad = useCallback(async (data: CreateNovedadData): Promise<PayrollNovedad | null> => {
    if (!periodId) {
      toast({
        title: "❌ Error",
        description: "No hay período activo",
        variant: "destructive"
      });
      return null;
    }

    setIsCreating(true);
    try {
      console.log('🚀 Creando novedad:', data);
      
      const createData: CreateNovedadData = {
        ...data,
        periodo_id: periodId
      };

      const result = await NovedadesEnhancedService.createNovedad(createData);
      
      if (result) {
        console.log('✅ Novedad creada exitosamente:', result);
        
        // Invalidar cache y recalcular
        NovedadesCalculationService.invalidateCache(result.empleado_id, periodId);
        await refreshEmployeeNovedades(result.empleado_id);
        
        toast({
          title: "✅ Novedad creada",
          description: `Se agregó la novedad de ${result.tipo_novedad}`,
          className: "border-green-200 bg-green-50"
        });
        
        return result;
      }
      return null;
    } catch (error) {
      console.error('❌ Error creando novedad:', error);
      
      let errorMessage = 'No se pudo crear la novedad';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Error al crear novedad",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [periodId, toast]);

  // Actualizar totales para un empleado específico
  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!periodId) return;
    
    console.log('🔄 Actualizando novedades para empleado:', employeeId);
    try {
      const totals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(employeeId, periodId);
      setNovedadesTotals(prev => ({
        ...prev,
        [employeeId]: totals
      }));
      setLastRefreshTime(Date.now());
      console.log('✅ Novedades actualizadas para empleado:', employeeId, totals);
    } catch (error) {
      console.error('❌ Error actualizando novedades de empleado:', error);
    }
  }, [periodId]);

  // Obtener totales de un empleado específico
  const getEmployeeNovedades = useCallback((employeeId: string): NovedadesTotals => {
    const result = novedadesTotals[employeeId] || {
      totalDevengos: 0,
      totalDeducciones: 0,
      totalNeto: 0,
      hasNovedades: false
    };
    return result;
  }, [novedadesTotals]);

  // Refrescar todos los empleados después de cambios
  const refreshAllEmployees = useCallback(async (employeeIds: string[]) => {
    console.log('🔄 Refrescando todos los empleados después de cambios');
    NovedadesCalculationService.invalidateCache();
    await loadNovedadesTotals(employeeIds);
  }, [loadNovedadesTotals]);

  // Obtener novedades existentes para un empleado
  const getEmployeeNovedadesList = useCallback(async (employeeId: string): Promise<PayrollNovedad[]> => {
    if (!employeeId || !periodId) return [];
    
    try {
      const novedades = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
      return novedades;
    } catch (error) {
      console.error('❌ Error obteniendo lista de novedades:', error);
      return [];
    }
  }, [periodId]);

  // Eliminar novedad
  const deleteNovedad = useCallback(async (novedadId: string, employeeId: string) => {
    try {
      console.log('🗑️ Eliminando novedad:', novedadId);
      await NovedadesEnhancedService.deleteNovedad(novedadId);
      
      // Invalidar cache y recalcular
      NovedadesCalculationService.invalidateCache(employeeId, periodId);
      await refreshEmployeeNovedades(employeeId);
      
      toast({
        title: "✅ Novedad eliminada",
        description: "La novedad se eliminó correctamente",
        className: "border-orange-200 bg-orange-50"
      });
    } catch (error) {
      console.error('❌ Error eliminando novedad:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
    }
  }, [periodId, refreshEmployeeNovedades, toast]);

  // Reset cuando cambie el período
  useEffect(() => {
    if (periodId) {
      console.log('🔄 Período cambió, limpiando estado:', periodId);
      setNovedadesTotals({});
      NovedadesCalculationService.invalidateCache();
      setLastRefreshTime(Date.now());
    }
  }, [periodId]);

  return {
    // Estados
    novedadesTotals,
    isLoading,
    isCreating,
    lastRefreshTime,
    
    // Métodos principales
    loadNovedadesTotals,
    createNovedad,
    refreshEmployeeNovedades,
    getEmployeeNovedades,
    refreshAllEmployees,
    getEmployeeNovedadesList,
    deleteNovedad
  };
};
