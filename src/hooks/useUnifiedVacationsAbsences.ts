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

  // Query para obtener datos unificados
  const {
    data: unifiedData = [],
    isLoading,
    error,
    refetch
  } = useQuery<UnifiedVacationData[]>({
    queryKey: ['unified-vacations-absences', filters],
    queryFn: () => VacationNovedadSyncService.getUnifiedVacationData(filters),
    staleTime: 30000, // 30 segundos
  });

  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: VacationNovedadSyncService.createVacationAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      toast({
        title: "Éxito",
        description: "Vacación/ausencia creada correctamente y sincronizada automáticamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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
        title: "Éxito",
        description: "Vacación/ausencia actualizada y sincronizada automáticamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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
        title: "Éxito",
        description: "Vacación/ausencia eliminada y sincronizada automáticamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Configurar realtime
  useEffect(() => {
    const channel = VacationNovedadSyncService.subscribeToVacationChanges((payload) => {
      console.log('🔄 Cambio detectado en sincronización:', payload);
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      
      // Mostrar notificación de sincronización
      if (payload.eventType !== 'SELECT') {
        toast({
          title: "Sincronización automática",
          description: "Los datos han sido sincronizados entre módulos",
          duration: 3000,
        });
      }
    });

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [queryClient, toast]);

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