
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
    staleTime: 10000, // 10 segundos - más frecuente para ver cambios rápido
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: VacationNovedadSyncService.createVacationAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      toast({
        title: "✅ Éxito",
        description: "Vacación/ausencia creada y sincronizada automáticamente con el módulo de novedades",
        className: "border-green-200 bg-green-50"
      });
    },
    onError: (error: Error) => {
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
        className: "border-blue-200 bg-blue-50"
      });
    },
    onError: (error: Error) => {
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
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Configurar realtime con notificaciones mejoradass
  useEffect(() => {
    console.log('🔔 Configurando realtime para sincronización bidireccional...');
    
    const channel = VacationNovedadSyncService.subscribeToVacationChanges((payload) => {
      console.log('🔄 Cambio detectado en sincronización:', payload);
      
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['unified-vacations-absences'] });
      
      // Mostrar notificación específica según el tipo de cambio
      if (payload.eventType !== 'SELECT') {
        const eventMessages = {
          INSERT: 'Nuevo registro sincronizado entre módulos',
          UPDATE: 'Registro actualizado y sincronizado',
          DELETE: 'Registro eliminado y sincronizado'
        };
        
        toast({
          title: "🔄 Sincronización automática",
          description: eventMessages[payload.eventType as keyof typeof eventMessages] || "Datos sincronizados entre módulos",
          duration: 3000,
          className: "border-purple-200 bg-purple-50"
        });
      }
    });

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        console.log('🔌 Desconectando realtime...');
        channel.unsubscribe();
      }
    };
  }, [queryClient, toast]);

  // Función helper para determinar el origen visual de un registro
  const getRecordOrigin = (record: UnifiedVacationData) => {
    return {
      isFromVacationModule: record.source_type === 'vacation',
      isFromNovedadModule: record.source_type === 'novedad',
      originLabel: record.source_type === 'vacation' ? 'Módulo Vacaciones' : 'Módulo Novedades',
      canEditInCurrentModule: record.source_type === 'vacation', // Solo editable si viene del módulo vacaciones
      statusLabel: record.status === 'pendiente' ? 'Pendiente de liquidar' : 
                  record.status === 'liquidada' ? 'Liquidada en nómina' : 'Cancelada'
    };
  };

  // Función helper para obtener estadísticas
  const getUnifiedStats = () => {
    if (!unifiedData || !Array.isArray(unifiedData)) {
      return {
        total: 0,
        pendientes: 0,
        liquidadas: 0,
        fromVacations: 0,
        fromNovedades: 0,
        totalDays: 0,
        totalValue: 0
      };
    }
    
    const stats = {
      total: unifiedData.length,
      pendientes: unifiedData.filter(r => r.status === 'pendiente').length,
      liquidadas: unifiedData.filter(r => r.status === 'liquidada').length,
      fromVacations: unifiedData.filter(r => r.source_type === 'vacation').length,
      fromNovedades: unifiedData.filter(r => r.source_type === 'novedad').length,
      totalDays: unifiedData.reduce((sum, r) => sum + (r.dias || 0), 0),
      totalValue: unifiedData.reduce((sum, r) => sum + (r.valor || 0), 0)
    };
    
    return stats;
  };

  return {
    // Datos unificados con funciones helper
    vacationsAbsences: unifiedData,
    isLoading,
    error,
    refetch,
    getRecordOrigin,
    getUnifiedStats,

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
