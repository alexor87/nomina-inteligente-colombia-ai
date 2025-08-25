
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NovedadesEnhancedService, CreateNovedadData } from '@/services/NovedadesEnhancedService';
import { PayrollNovedad } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';

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
 * ✅ HOOK UNIFICADO - FASE 3 CRÍTICA
 * Hook consolidado para manejar todas las operaciones de novedades
 * Funciona tanto para empresa+período como para empleado específico
 */
export const usePayrollNovedadesUnified = ({
  companyId,
  periodId,
  employeeId,
  enabled = true
}: UsePayrollNovedadesUnifiedOptions): UsePayrollNovedadesUnifiedReturn => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determinar la key y función de fetch según los parámetros
  const queryKey = employeeId 
    ? ['novedades', 'employee', employeeId, periodId]
    : ['novedades', 'company', companyId, periodId];

  const fetchFunction = employeeId 
    ? () => NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId!)
    : () => NovedadesEnhancedService.getNovedades(companyId!, periodId!);

  // Query principal
  const {
    data: novedades = [],
    isLoading,
    error,
    refetch: queryRefetch
  } = useQuery({
    queryKey,
    queryFn: fetchFunction,
    enabled: enabled && ((companyId && periodId) || (employeeId && periodId)),
    staleTime: 30000, // 30 segundos
    gcTime: 300000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false
  });

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
      
      queryClient.invalidateQueries({ 
        queryKey: ['novedades'],
        exact: false 
      });
      
      toast({
        title: "✅ Novedad creada",
        description: "La novedad se ha creado correctamente",
        className: "border-green-200 bg-green-50"
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
      
      queryClient.invalidateQueries({ 
        queryKey: ['novedades'],
        exact: false 
      });
      
      toast({
        title: "✅ Novedad actualizada",
        description: "La novedad se ha actualizado correctamente",
        className: "border-green-200 bg-green-50"
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

  // Mutation para eliminar novedad
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsDeleting(true);
      console.log('🔄 Eliminando novedad:', id);
      
      await NovedadesEnhancedService.deleteNovedad(id);
      return id;
    },
    onSuccess: (deletedId) => {
      console.log('✅ Novedad eliminada exitosamente:', deletedId);
      
      // Actualizar cache local
      queryClient.setQueryData(queryKey, (old: any[] = []) => {
        return old.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['novedades'],
        exact: false 
      });
      
      toast({
        title: "✅ Novedad eliminada",
        description: "La novedad se ha eliminado correctamente",
        className: "border-green-200 bg-green-50"
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
    refetch
  };
};
