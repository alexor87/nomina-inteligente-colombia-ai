
import { useState, useEffect, useCallback } from 'react';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { PayrollIntegratedDataService } from '@/services/PayrollIntegratedDataService';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import type { Tables } from '@/integrations/supabase/types';

type PayrollNovedad = Tables<'payroll_novedades'>;
import { DisplayNovedad } from '@/types/vacation-integration';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useNovedades = (periodId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['novedades', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      try {
        // Get company ID from user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        
        if (!profile?.company_id) return [];

        const novedades = await NovedadesEnhancedService.getNovedades(profile.company_id, periodId);
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
    enabled: !!periodId,
  });

  const createNovedad = useCallback(async (data: CreateNovedadData) => {
    // Ensure company_id is present
    if (!data.company_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.company_id) {
          data.company_id = profile.company_id;
        }
      }
    }

    if (!data.company_id) {
      throw new Error('Company ID is required');
    }

    try {
      // Ensure all required fields are present
      const createData: CreateNovedadData = {
        ...data,
        valor: data.valor || 0,
        constitutivo_salario: data.constitutivo_salario || false
      };

      const result = await NovedadesEnhancedService.createNovedad(createData);
      
      if (result) {
        await refetch();
        return { success: true, data: result };
      }
      
      return { success: false, error: 'Failed to create novedad' };
    } catch (error: any) {
      console.error('Error creating novedad:', error);
      return { success: false, error: error.message };
    }
  }, [refetch]);

  const updateNovedad = useCallback(async (id: string, data: CreateNovedadData) => {
    try {
      const result = await NovedadesEnhancedService.updateNovedad(id, data);
      if (result) {
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
      await refetch();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting novedad:', error);
      return { success: false, error: error.message };
    }
  }, [refetch]);

  // SOLUCIÓN KISS: Usar servicio simplificado que ya no duplica datos
  const loadIntegratedNovedades = useCallback(async (employeeId: string): Promise<DisplayNovedad[]> => {
    try {
      if (!periodId) return [];
      
      console.log('🔄 useNovedades - Cargando datos unificados (sin duplicados):', {
        employeeId,
        periodId
      });

      // Usar el servicio simplificado que solo consulta payroll_novedades
      const unifiedData = await PayrollIntegratedDataService.getEmployeePeriodData(
        employeeId,
        periodId
      );

      console.log('✅ useNovedades - Datos unificados cargados sin duplicados:', {
        totalElementos: unifiedData.length,
        novedades: unifiedData.filter(item => item.origen === 'novedades').length,
        ausenciasFragmentadas: unifiedData.filter(item => item.origen === 'vacaciones').length
      });

      return unifiedData;
    } catch (error) {
      console.error('❌ useNovedades - Error loading unified data:', error);
      return [];
    }
  }, [periodId]);

  return {
    novedades: data || [],
    isLoading,
    error,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    refetch,
    loadIntegratedNovedades
  };
};
