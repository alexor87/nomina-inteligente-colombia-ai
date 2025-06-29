
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';

export const useNovedades = (periodoId: string) => {
  const [employeeNovedades, setEmployeeNovedades] = useState<Record<string, PayrollNovedad[]>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: allNovedades = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['novedades', periodoId],
    queryFn: () => NovedadesEnhancedService.getNovedadesByPeriod(periodoId),
    enabled: !!periodoId
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateNovedadData) => NovedadesEnhancedService.createNovedad(data),
    onSuccess: () => {
      toast({
        title: "Novedad creada",
        description: "La novedad se ha creado exitosamente.",
      });
      refetch();
    },
    onError: (error) => {
      console.error('Error creating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la novedad.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateNovedadData }) => 
      NovedadesEnhancedService.updateNovedad(id, data),
    onSuccess: () => {
      toast({
        title: "Novedad actualizada",
        description: "La novedad se ha actualizado exitosamente.",
      });
      refetch();
    },
    onError: (error) => {
      console.error('Error updating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la novedad.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => NovedadesEnhancedService.deleteNovedad(id),
    onSuccess: () => {
      toast({
        title: "Novedad eliminada",
        description: "La novedad se ha eliminado exitosamente.",
      });
      refetch();
    },
    onError: (error) => {
      console.error('Error deleting novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la novedad.",
        variant: "destructive"
      });
    }
  });

  const loadNovedadesForEmployee = async (employeeId: string) => {
    try {
      const novedades = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodoId);
      setEmployeeNovedades(prev => ({
        ...prev,
        [employeeId]: novedades
      }));
    } catch (error) {
      console.error('Error loading employee novedades:', error);
    }
  };

  const createNovedad = async (data: CreateNovedadData, skipRecalculation?: boolean) => {
    await createMutation.mutateAsync(data);
    if (!skipRecalculation) {
      // Trigger recalculation logic if needed
    }
  };

  const updateNovedad = async (id: string, data: CreateNovedadData, employeeId: string, skipRecalculation?: boolean) => {
    await updateMutation.mutateAsync({ id, data });
    if (!skipRecalculation) {
      // Trigger recalculation logic if needed
    }
    // Refresh employee novedades
    await loadNovedadesForEmployee(employeeId);
  };

  const deleteNovedad = async (id: string, employeeId: string, skipRecalculation?: boolean) => {
    await deleteMutation.mutateAsync(id);
    if (!skipRecalculation) {
      // Trigger recalculation logic if needed
    }
    // Refresh employee novedades
    await loadNovedadesForEmployee(employeeId);
  };

  const getEmployeeNovedades = (employeeId: string): PayrollNovedad[] => {
    return employeeNovedades[employeeId] || [];
  };

  const getEmployeeNovedadesCount = (employeeId: string): number => {
    const novedades = getEmployeeNovedades(employeeId);
    return novedades.length;
  };

  return {
    allNovedades,
    employeeNovedades,
    isLoading,
    refetch,
    loadNovedadesForEmployee,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    getEmployeeNovedades,
    getEmployeeNovedadesCount
  };
};
