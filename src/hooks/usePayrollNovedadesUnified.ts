
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesCalculationService, NovedadesTotals } from '@/services/NovedadesCalculationService';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';
import { supabase } from '@/integrations/supabase/client';

export const usePayrollNovedadesUnified = (periodId: string) => {
  const [novedadesTotals, setNovedadesTotals] = useState<Record<string, NovedadesTotals>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const { toast } = useToast();

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

  // Crear múltiples novedades de una vez
  const createMultipleNovedades = useCallback(async (novedadesArray: CreateNovedadData[]): Promise<PayrollNovedad[]> => {
    if (!periodId) {
      toast({
        title: "❌ Error",
        description: "No hay período activo",
        variant: "destructive"
      });
      return [];
    }

    setIsCreating(true);
    const createdNovedades: PayrollNovedad[] = [];
    
    try {
      console.log(`🚀 Creating ${novedadesArray.length} novelties`);
      
      // Get company_id if not provided
      let companyId = novedadesArray[0]?.company_id;
      if (!companyId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          companyId = profile?.company_id;
        }
      }

      if (!companyId) {
        throw new Error('No se pudo determinar la empresa');
      }
      
      // Crear cada novedad
      for (const novedadData of novedadesArray) {
        const createData: CreateNovedadData = {
          ...novedadData,
          periodo_id: periodId,
          company_id: companyId, // ✅ Ensure company_id is always present
          valor: Number(novedadData.valor) || 0, // ✅ Ensure valor is always a number
          horas: novedadData.horas ? Number(novedadData.horas) : undefined,
          dias: novedadData.dias ? Number(novedadData.dias) : undefined,
          constitutivo_salario: novedadData.constitutivo_salario || false
        };

        console.log('💾 Creating novelty:', createData);
        const result = await NovedadesEnhancedService.createNovedad(createData);
        
        if (result) {
          createdNovedades.push(result);
          console.log('✅ Novelty created:', result);
        }
      }

      if (createdNovedades.length > 0) {
        // Invalidar cache y recalcular
        const employeeId = createdNovedades[0].empleado_id;
        console.log('🔄 Invalidating cache and recalculating totals...');
        NovedadesCalculationService.invalidateCache(employeeId, periodId);
        
        // Wait a bit for DB to propagate, then refresh
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshEmployeeNovedades(employeeId);
        
        toast({
          title: "✅ Novedades creadas",
          description: `Se crearon ${createdNovedades.length} novedades exitosamente`,
          className: "border-green-200 bg-green-50"
        });
      }
      
      return createdNovedades;
    } catch (error) {
      console.error('❌ Error creating novelties:', error);
      
      let errorMessage = 'No se pudieron crear las novedades';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Error al crear novedades",
        description: errorMessage,
        variant: "destructive"
      });
      return [];
    } finally {
      setIsCreating(false);
    }
  }, [periodId, toast, refreshEmployeeNovedades]);

  // Crear nueva novedad (single)
  const createNovedad = useCallback(async (data: CreateNovedadData): Promise<PayrollNovedad | null> => {
    const results = await createMultipleNovedades([data]);
    return results.length > 0 ? results[0] : null;
  }, [createMultipleNovedades]);

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
      
      // Invalidar cache and recalcular
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
    createMultipleNovedades,
    refreshEmployeeNovedades,
    getEmployeeNovedades,
    refreshAllEmployees,
    getEmployeeNovedadesList,
    deleteNovedad
  };
};
