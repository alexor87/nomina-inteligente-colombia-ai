
import { useState, useCallback, useEffect } from 'react';
import { NovedadesCalculationService, NovedadesTotals } from '@/services/NovedadesCalculationService';

export const usePayrollNovedades = (periodId: string) => {
  const [novedadesTotals, setNovedadesTotals] = useState<Record<string, NovedadesTotals>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // Forzar recarga completa cuando cambie el período
  useEffect(() => {
    if (periodId) {
      console.log('🔄 Período cambió, limpiando estado de novedades:', periodId);
      setNovedadesTotals({});
      NovedadesCalculationService.invalidateCache();
      setLastRefreshTime(Date.now());
    }
  }, [periodId]);

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

  // Actualizar totales para un empleado específico
  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!periodId) {
      console.warn('⚠️ No hay período ID para actualizar novedades');
      return;
    }
    
    console.log('🔄 Actualizando novedades para empleado:', employeeId, 'período:', periodId);
    try {
      // Invalidar cache específico
      NovedadesCalculationService.invalidateCache(employeeId, periodId);
      
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

  return {
    novedadesTotals,
    isLoading,
    loadNovedadesTotals,
    refreshEmployeeNovedades,
    getEmployeeNovedades,
    refreshAllEmployees,
    lastRefreshTime
  };
};
