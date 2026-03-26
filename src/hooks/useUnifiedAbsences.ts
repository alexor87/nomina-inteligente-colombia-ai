
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VacationNovedadSyncService } from '@/services/VacationNovedadSyncService';
import { VacationAbsenceFilters, VacationAbsenceFormData } from '@/types/vacations';
import { UnifiedVacationData } from '@/types/unifiedVacations';
import { useToast } from '@/hooks/use-toast';

export function useUnifiedAbsences(filters: VacationAbsenceFilters) {
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch unified data
  const {
    data: unifiedData = [],
    isLoading,
    error,
    refetch
  } = useQuery<UnifiedVacationData[]>({
    queryKey: ['unified-absences', filters],
    queryFn: () => VacationNovedadSyncService.getUnifiedVacationData(filters),
    staleTime: 10000,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Mutation to create
  const createMutation = useMutation({
    mutationFn: VacationNovedadSyncService.createVacationAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-absences'] });
      toast({
        title: "Exito",
        description: "Ausencia creada y sincronizada automaticamente con el modulo de novedades",
        className: "border-green-200 bg-green-50"
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

  // Mutation to update
  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: Partial<VacationAbsenceFormData> }) =>
      VacationNovedadSyncService.updateVacationAbsence(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-absences'] });
      toast({
        title: "Exito",
        description: "Ausencia actualizada y sincronizada automaticamente",
        className: "border-blue-200 bg-blue-50"
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

  // Mutation to delete
  const deleteMutation = useMutation({
    mutationFn: VacationNovedadSyncService.deleteVacationAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-absences'] });
      toast({
        title: "Exito",
        description: "Ausencia eliminada y sincronizada automaticamente",
        className: "border-orange-200 bg-orange-50"
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

  // Configure realtime with improved notifications
  useEffect(() => {
    console.log('Configuring realtime for bidirectional sync...');

    const channel = VacationNovedadSyncService.subscribeToVacationChanges((payload) => {
      console.log('Change detected in sync:', payload);

      queryClient.invalidateQueries({ queryKey: ['unified-absences'] });

      if (payload.eventType !== 'SELECT') {
        const eventMessages = {
          INSERT: 'Nuevo registro sincronizado entre modulos',
          UPDATE: 'Registro actualizado y sincronizado',
          DELETE: 'Registro eliminado y sincronizado'
        };

        toast({
          title: "Sincronizacion automatica",
          description: eventMessages[payload.eventType as keyof typeof eventMessages] || "Datos sincronizados entre modulos",
          duration: 3000,
          className: "border-purple-200 bg-purple-50"
        });
      }
    });

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        console.log('Disconnecting realtime...');
        channel.unsubscribe();
      }
    };
  }, [queryClient, toast]);

  // Helper function to determine visual origin of a record
  const getRecordOrigin = (record: UnifiedVacationData) => {
    return {
      isFromAbsenceModule: record.source_type === 'vacation',
      isFromNovedadModule: record.source_type === 'novedad',
      originLabel: record.source_type === 'vacation' ? 'Modulo Ausencias' : 'Modulo Novedades',
      canEditInCurrentModule: record.source_type === 'vacation',
      statusLabel: record.status === 'pendiente' ? 'Pendiente de liquidar' :
                  record.status === 'liquidada' ? 'Liquidada en nomina' : 'Cancelada'
    };
  };

  // Helper function to get statistics
  const getUnifiedStats = () => {
    if (!unifiedData || !Array.isArray(unifiedData)) {
      return {
        total: 0,
        pendientes: 0,
        liquidadas: 0,
        fromAbsences: 0,
        fromNovedades: 0,
        totalDays: 0,
        totalValue: 0
      };
    }

    const stats = {
      total: unifiedData.length,
      pendientes: unifiedData.filter(r => r.status === 'pendiente').length,
      liquidadas: unifiedData.filter(r => r.status === 'liquidada').length,
      fromAbsences: unifiedData.filter(r => r.source_type === 'vacation').length,
      fromNovedades: unifiedData.filter(r => r.source_type === 'novedad').length,
      totalDays: unifiedData.reduce((sum, r) => sum + (r.dias || 0), 0),
      totalValue: unifiedData.reduce((sum, r) => sum + (r.valor || 0), 0)
    };

    return stats;
  };

  return {
    // Unified data with helper functions
    absences: unifiedData,
    isLoading,
    error,
    refetch,
    getRecordOrigin,
    getUnifiedStats,

    // CRUD functions
    createAbsence: createMutation.mutateAsync,
    updateAbsence: updateMutation.mutateAsync,
    deleteAbsence: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Realtime channel for manual cleanup if needed
    realtimeChannel
  };
}
