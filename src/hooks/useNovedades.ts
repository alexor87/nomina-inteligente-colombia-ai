import { useState, useEffect, useCallback } from 'react';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

export const useNovedades = (companyId: string, periodId?: string) => {
  const [novedades, setNovedades] = useState<PayrollNovedad[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['novedades', companyId, periodId],
    queryFn: async () => {
      if (!companyId || !periodId) return [];
      try {
        const novedades = await NovedadesEnhancedService.getNovedades(companyId, periodId);
        setNovedades(novedades);
        return novedades;
      } catch (error) {
        console.error("Error fetching novedades:", error);
        toast({
          title: "Error",
          description: "Failed to fetch novedades",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!companyId && !!periodId,
  });

  const createNovedad = useCallback(async (data: CreateNovedadData) => {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    try {
      // ✅ Ensure all required fields are present and handle constitutivo_salario
      const createData: CreateNovedadData = {
        ...data,
        company_id: companyId,
        valor: data.valor || 0, // Ensure valor is never undefined
        constitutivo_salario: data.constitutivo_salario || false // Provide default value
      };

      const result = await NovedadesEnhancedService.createNovedad(createData);
      
      if (result) {
        // Refresh the list after creation
        await refetch();
        return { success: true, data: result };
      }
      
      return { success: false, error: 'Failed to create novedad' };
    } catch (error: any) {
      console.error('Error creating novedad:', error);
      return { success: false, error: error.message };
    }
  }, [companyId, refetch]);

  const updateNovedad = useCallback(async (id: string, data: CreateNovedadData) => {
    try {
      const result = await NovedadesEnhancedService.updateNovedad(id, data);
      if (result) {
        // Refresh the list after update
        await refetch();
        return { success: true, data: result };
      }
      return { success: false, error: 'Failed to update novedad' };
    } catch (error: any) {
      console.error('Error updating novedad:', error);
      return { success: false, error: error.message };
    }
  }, [refetch]);

  const deleteNovedad = useCallback(async (id: string) => {
    try {
      await NovedadesEnhancedService.deleteNovedad(id);
      // Refresh the list after deletion
      await refetch();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting novedad:', error);
      return { success: false, error: error.message };
    }
  }, [refetch]);

  return {
    novedades,
    isLoading,
    error,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    refetch
  };
};
