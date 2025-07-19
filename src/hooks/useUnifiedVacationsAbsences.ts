
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VacationNovedadSyncService } from '@/services/VacationNovedadSyncService';
import { VacationAbsenceFilters, VacationAbsenceFormData } from '@/types/vacations';
import { UnifiedVacationData } from '@/types/unifiedVacations';
import { useToast } from '@/hooks/use-toast';

export function useUnifiedVacationsAbsences(filters: VacationAbsenceFilters) {
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ QUERY CORREGIDA: Usar el servicio reparado
  const {
    data: unifiedData = [],
    isLoading,
    error,
    refetch
  } = useQuery<UnifiedVacationData[]>({
    queryKey: ['unified-vacations-absences', filters],
    queryFn: () => {
      console.log('🔄 Executing unified query with filters:', filters);
      return VacationNovedadSyncService.getUnifiedVacationData(filters);
    },
    staleTime: 30000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: VacationNovedadSyncService.createVacationAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      toast({
        title: "✅ Éxito",
        description: "Vacación/ausencia creada correctamente y sincronizada automáticamente",
        className: "border-green-200 bg-green-50"
      });
    },
    onError: (error: Error) => {
      console.error('❌ Error creating vacation:', error);
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: Partial<VacationAbsenceFormData> }) =>
      VacationNovedadSyncService.updateVacationAbsence(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      toast({
        title: "✅ Éxito",
        description: "Vacación/ausencia actualizada y sincronizada automáticamente",
        className: "border-green-200 bg-green-50"
      });
    },
    onError: (error: Error) => {
      console.error('❌ Error updating vacation:', error);
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: VacationNovedadSyncService.deleteVacationAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      toast({
        title: "✅ Éxito",
        description: "Vacación/ausencia eliminada y sincronizada automáticamente",
        className: "border-orange-200 bg-orange-50"
      });
    },
    onError: (error: Error) => {
      console.error('❌ Error deleting vacation:', error);
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ✅ CONFIGURAR REALTIME CORREGIDO
  useEffect(() => {
    console.log('🔄 Setting up realtime subscription for vacation sync');
    
    const channel = VacationNovedadSyncService.subscribeToVacationChanges((payload) => {
      console.log('🔄 Realtime change detected:', payload);
      
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      
      // Mostrar notificación de sincronización
      if (payload.eventType !== 'SELECT') {
        toast({
          title: "🔄 Sincronización automática",
          description: "Los datos han sido sincronizados entre módulos",
          duration: 3000,
        });
      }
    });

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        console.log('🔄 Cleaning up realtime subscription');
        channel.unsubscribe();
      }
    };
  }, [queryClient, toast]);

  // ✅ DEBUG: Log cuando hay errores
  useEffect(() => {
    if (error) {
      console.error('❌ Error in useUnifiedVacationsAbsences:', error);
    }
  }, [error]);

  return {
    // Datos unificados
    vacationsAbsences: unifiedData,
    isLoading,
    error,
    refetch,

    // Funciones CRUD
    createVacationAbsence: createMutation.mutateAsync,
    updateVacationAbsence: updateMutation.mutateAsync,
    deleteVacationAbsence: deleteMutation.mutateAsync,

    // Estados de las mutations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Canal de realtime para limpieza manual si es necesario
    realtimeChannel
  };
}
