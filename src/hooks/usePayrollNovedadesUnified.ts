
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NovedadesEnhancedService, CreateNovedadData } from '@/services/NovedadesEnhancedService';
import { PayrollNovedad } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeNovedadesCacheStore } from '@/stores/employeeNovedadesCacheStore';

export interface UsePayrollNovedadesUnifiedOptions {
  companyId?: string;
  periodId?: string;
  employeeId?: string;
  enabled?: boolean;
}

export interface UsePayrollNovedadesUnifiedReturn {
  novedades: PayrollNovedad[];
  isLoading: boolean;
  error: Error | null;
  createNovedad: (data: CreateNovedadData) => Promise<PayrollNovedad | null>;
  updateNovedad: (id: string, data: Partial<CreateNovedadData>) => Promise<PayrollNovedad | null>;
  deleteNovedad: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  refetch: () => void;
  loadNovedadesTotals: (employeeIds: string[]) => void;
  getEmployeeNovedades: (employeeId: string) => { totalNeto: number; devengos: number; deducciones: number };
  refreshEmployeeNovedades: (employeeId: string) => Promise<void>;
  lastRefreshTime: number;
  getEmployeeNovedadesList: (employeeId: string) => Promise<PayrollNovedad[]>;
}

// Helper function to transform PayrollNovedad to the expected format
const transformNovedadForQuery = (novedad: PayrollNovedad) => ({
  adjunto_url: novedad.adjunto_url || '',
  base_calculo: novedad.base_calculo ? JSON.stringify(novedad.base_calculo) : '',
  company_id: novedad.company_id,
  constitutivo_salario: novedad.constitutivo_salario || false,
  creado_por: novedad.creado_por || '',
  created_at: novedad.created_at,
  dias: novedad.dias || 0,
  empleado_id: novedad.empleado_id,
  fecha_fin: novedad.fecha_fin || '',
  fecha_inicio: novedad.fecha_inicio || '',
  horas: novedad.horas || 0,
  id: novedad.id,
  observacion: novedad.observacion || '',
  periodo_id: novedad.periodo_id,
  subtipo: novedad.subtipo || '',
  tipo_novedad: novedad.tipo_novedad,
  updated_at: novedad.updated_at,
  valor: novedad.valor
});

/**
 * ✅ HOOK UNIFICADO - FASE 4 CRÍTICA CON STORE GLOBAL
 * Hook consolidado para manejar todas las operaciones de novedades
 * Funciona tanto para empresa+período como para empleado específico
 * Usa store global para sincronización perfecta entre componentes
 */
export const usePayrollNovedadesUnified = (
  optionsOrPeriodId: UsePayrollNovedadesUnifiedOptions | string
): UsePayrollNovedadesUnifiedReturn => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ NUEVO: Usar store global en lugar de estado local
  const {
    employeeNovedadesCache,
    lastRefreshTime,
    setEmployeeNovedades,
    updateEmployeeNovedades,
    removeNovedadFromCache,
    setLastRefreshTime
  } = useEmployeeNovedadesCacheStore();

  // ✅ FIXED: Handle both string and options parameter
  const options: UsePayrollNovedadesUnifiedOptions = typeof optionsOrPeriodId === 'string' 
    ? { periodId: optionsOrPeriodId, enabled: true }
    : optionsOrPeriodId;

  const { companyId, periodId, employeeId, enabled = true } = options;

  // Determinar la key y función de fetch según los parámetros
  const queryKey = employeeId 
    ? ['novedades', 'employee', employeeId, periodId]
    : ['novedades', 'company', companyId, periodId];

  const fetchFunction = employeeId 
    ? () => NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId!)
    : () => NovedadesEnhancedService.getNovedades(companyId!, periodId!);

  // ✅ FIXED: Query principal with correct enabled type
  const {
    data: novedades = [],
    isLoading,
    error,
    refetch: queryRefetch
  } = useQuery({
    queryKey,
    queryFn: fetchFunction,
    enabled: Boolean(enabled && ((companyId && periodId) || (employeeId && periodId))),
    staleTime: 30000, // 30 segundos
    gcTime: 300000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false
  });

  // ✅ RESTORED: Load novedades totals for multiple employees
  const loadNovedadesTotals = useCallback(async (employeeIds: string[]) => {
    if (!periodId) return;
    
    console.log('📊 Loading novedades totals for employees:', employeeIds);
    
    const updates: Record<string, PayrollNovedad[]> = {};
    
    for (const employeeId of employeeIds) {
      try {
        const employeeNovedades = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
        updates[employeeId] = employeeNovedades;
      } catch (error) {
        console.error(`Error loading novedades for employee ${employeeId}:`, error);
      }
    }
    
    // ✅ NUEVO: Actualizar store global de una vez
    updateEmployeeNovedades(updates);
  }, [periodId, updateEmployeeNovedades]);

  // ✅ RESTORED: Get employee novedades totals usando store global
  const getEmployeeNovedades = useCallback((employeeId: string) => {
    const employeeNovedadesList = employeeNovedadesCache[employeeId] || [];
    
    let devengos = 0;
    let deducciones = 0;
    
    employeeNovedadesList.forEach(novedad => {
      const valor = Number(novedad.valor || 0);
      if (valor >= 0) {
        devengos += valor;
      } else {
        deducciones += Math.abs(valor);
      }
    });
    
    const totalNeto = devengos - deducciones;
    
    console.log('🧮 Global Store: Calculando totales para empleado:', employeeId, {
      novedadesCount: employeeNovedadesList.length,
      devengos,
      deducciones,
      totalNeto
    });
    
    return { totalNeto, devengos, deducciones };
  }, [employeeNovedadesCache]);

  // ✅ RESTORED: Refresh employee novedades usando store global
  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!periodId) return;
    
    try {
      console.log('🔄 Refrescando novedades específicas del empleado:', employeeId);
      const employeeNovedades = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
      setEmployeeNovedades(employeeId, employeeNovedades);
    } catch (error) {
      console.error(`Error refreshing novedades for employee ${employeeId}:`, error);
    }
  }, [periodId, setEmployeeNovedades]);

  // ✅ RESTORED: Get employee novedades list
  const getEmployeeNovedadesList = useCallback(async (employeeId: string): Promise<PayrollNovedad[]> => {
    if (!periodId) return [];
    
    try {
      const employeeNovedades = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
      return employeeNovedades;
    } catch (error) {
      console.error(`Error getting novedades list for employee ${employeeId}:`, error);
      return [];
    }
  }, [periodId]);

  // Mutation para crear novedad
  const createMutation = useMutation({
    mutationFn: async (data: CreateNovedadData) => {
      setIsCreating(true);
      console.log('🔄 Creando novedad:', data);
      
      const result = await NovedadesEnhancedService.createNovedad(data);
      
      if (!result) {
        throw new Error('No se pudo crear la novedad');
      }
      
      return result;
    },
    onSuccess: (newNovedad) => {
      console.log('✅ Novedad creada exitosamente:', newNovedad);
      
      // Transform the novedad for cache update
      const transformedNovedad = transformNovedadForQuery(newNovedad);
      
      // Invalidar y actualizar cache
      queryClient.setQueryData(queryKey, (old: typeof transformedNovedad[] = []) => {
        return [...old, transformedNovedad];
      });
      
      // ✅ NUEVO: Update global store
      if (newNovedad.empleado_id) {
        refreshEmployeeNovedades(newNovedad.empleado_id);
      }
      
      queryClient.invalidateQueries({ 
        queryKey: ['novedades'],
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payroll-novedades-unified'],
        exact: false 
      });
      
      toast({
        title: "✅ Novedad creada",
        description: "La novedad se ha creado correctamente",
        variant: "success"
      });
    },
    onError: (error: Error) => {
      console.error('❌ Error creando novedad:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Error creando la novedad",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  // Mutation para actualizar novedad
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateNovedadData> }) => {
      setIsUpdating(true);
      console.log('🔄 Actualizando novedad:', id, data);
      
      const result = await NovedadesEnhancedService.updateNovedad(id, data);
      
      if (!result) {
        throw new Error('No se pudo actualizar la novedad');
      }
      
      return result;
    },
    onSuccess: (updatedNovedad) => {
      console.log('✅ Novedad actualizada exitosamente:', updatedNovedad);
      
      // Transform the novedad for cache update
      const transformedNovedad = transformNovedadForQuery(updatedNovedad);
      
      // Actualizar cache local
      queryClient.setQueryData(queryKey, (old: typeof transformedNovedad[] = []) => {
        return old.map(item => 
          item.id === updatedNovedad.id ? transformedNovedad : item
        );
      });
      
      // ✅ NUEVO: Update global store
      if (updatedNovedad.empleado_id) {
        refreshEmployeeNovedades(updatedNovedad.empleado_id);
      }
      
      queryClient.invalidateQueries({ 
        queryKey: ['novedades'],
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payroll-novedades-unified'],
        exact: false 
      });
      
      toast({
        title: "✅ Novedad actualizada",
        description: "La novedad se ha actualizado correctamente",
        variant: "success"
      });
    },
    onError: (error: Error) => {
      console.error('❌ Error actualizando novedad:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Error actualizando la novedad",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    }
  });

  // ✅ MEJORADO: Mutation para eliminar novedad con store global
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsDeleting(true);
      console.log('🔄 Eliminando novedad:', id);
      
      // Obtener la novedad antes de eliminarla para saber el empleado afectado
      const novedadToDelete = novedades.find(n => n.id === id);
      const affectedEmployeeId = novedadToDelete?.empleado_id;
      
      await NovedadesEnhancedService.deleteNovedad(id);
      return { deletedId: id, employeeId: affectedEmployeeId };
    },
    onSuccess: ({ deletedId, employeeId }) => {
      console.log('✅ Novedad eliminada exitosamente:', deletedId, 'Empleado afectado:', employeeId);
      
      // Actualizar cache local de la query actual
      queryClient.setQueryData(queryKey, (old: any[] = []) => {
        return old.filter(item => item.id !== deletedId);
      });

      // ✅ CRÍTICO: Actualizar store global inmediatamente
      console.log('🏪 Removiendo novedad del store global:', deletedId);
      removeNovedadFromCache(deletedId);

      // ✅ CRÍTICO: Si conocemos el empleado afectado, refrescar su cache específicamente
      if (employeeId) {
        console.log('🔄 Refrescando cache específico del empleado en store global:', employeeId);
        refreshEmployeeNovedades(employeeId).then(() => {
          console.log('✅ Cache del empleado actualizado exitosamente en store global');
        }).catch(err => {
          console.error('❌ Error refrescando cache del empleado:', err);
        });
      }

      // Forzar recálculo dependiente (triggers en tablas) - CRÍTICO PARA SINCRONIZACIÓN
      const newRefreshTime = Date.now();
      setLastRefreshTime(newRefreshTime);
      console.log('⏰ Nuevo lastRefreshTime establecido en store global:', newRefreshTime);
      
      // ✅ MEJORADO: Invalidación más agresiva y específica
      queryClient.invalidateQueries({ 
        queryKey: ['novedades'],
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payroll-novedades-unified'],
        exact: false 
      });
      
      // ✅ NUEVO: Invalidar específicamente las queries de empleado si lo conocemos
      if (employeeId) {
        queryClient.invalidateQueries({
          queryKey: ['novedades', 'employee', employeeId],
          exact: false
        });
      }
      
      toast({
        title: "✅ Novedad eliminada",
        description: "La novedad se ha eliminado correctamente",
        variant: "success"
      });
    },
    onError: (error: Error) => {
      console.error('❌ Error eliminando novedad:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Error eliminando la novedad",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  // Funciones wrapper para las mutations
  const createNovedad = async (data: CreateNovedadData): Promise<PayrollNovedad | null> => {
    try {
      return await createMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error en createNovedad:', error);
      return null;
    }
  };

  const updateNovedad = async (id: string, data: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> => {
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch (error) {
      console.error('Error en updateNovedad:', error);
      return null;
    }
  };

  const deleteNovedad = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error en deleteNovedad:', error);
      throw error;
    }
  };

  const refetch = () => {
    queryRefetch();
  };

  return {
    novedades,
    isLoading,
    error: error as Error | null,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    isCreating,
    isUpdating,
    isDeleting,
    refetch,
    loadNovedadesTotals,
    getEmployeeNovedades,
    refreshEmployeeNovedades,
    lastRefreshTime, // ✅ NUEVO: Viene del store global
    getEmployeeNovedadesList
  };
};
