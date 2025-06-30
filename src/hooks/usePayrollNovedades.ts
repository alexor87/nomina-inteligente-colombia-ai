
import { useState, useCallback, useEffect } from 'react';
import { NovedadesCalculationService, NovedadesTotals } from '@/services/NovedadesCalculationService';

export const usePayrollNovedades = (periodId: string) => {
  const [novedadesTotals, setNovedadesTotals] = useState<Record<string, NovedadesTotals>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Cargar totales de novedades para empleados específicos
  const loadNovedadesTotals = useCallback(async (employeeIds: string[]) => {
    if (!periodId || employeeIds.length === 0) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Cargando totales de novedades para empleados:', employeeIds);
      const totals = await NovedadesCalculationService.calculateAllEmployeesNovedadesTotals(employeeIds, periodId);
      setNovedadesTotals(totals);
      console.log('✅ Totales de novedades cargados:', totals);
    } catch (error) {
      console.error('❌ Error cargando totales de novedades:', error);
    } finally {
      setIsLoading(false);
    }
  }, [periodId]);

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
      console.log('✅ Novedades actualizadas para empleado:', employeeId, totals);
    } catch (error) {
      console.error('❌ Error actualizando novedades de empleado:', error);
    }
  }, [periodId]);

  // Obtener totales de un empleado específico
  const getEmployeeNovedades = useCallback((employeeId: string): NovedadesTotals => {
    return novedadesTotals[employeeId] || {
      totalDevengos: 0,
      totalDeducciones: 0,
      totalNeto: 0,
      hasNovedades: false
    };
  }, [novedadesTotals]);

  return {
    novedadesTotals,
    isLoading,
    loadNovedadesTotals,
    refreshEmployeeNovedades,
    getEmployeeNovedades
  };
};
