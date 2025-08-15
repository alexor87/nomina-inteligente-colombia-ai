
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
    console.log('🚀 V20.0 DIAGNOSIS - useNovedades createNovedad called with:', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // ✅ V19.0: Estructura directa como el código que funciona
    let createData: CreateNovedadData = { ...data };

    // Ensure company_id is present
    if (!createData.company_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.company_id) {
          createData.company_id = profile.company_id;
        }
      }
    }

    if (!createData.company_id) {
      throw new Error('Company ID is required');
    }

    // ✅ V19.0: Asegurar period ID correcto
    createData.periodo_id = periodId;

    console.log('📤 V20.0 DIAGNOSIS - useNovedades final createData before service call:', {
      ...createData,
      timestamp: new Date().toISOString()
    });

    try {
      // ✅ V19.0: Llamar al servicio para guardar en base de datos
      const result = await NovedadesEnhancedService.createNovedad(createData);
      
      if (result) {
        console.log('✅ V20.0 DIAGNOSIS - useNovedades received result from service:', {
          id: result.id,
          tipo_novedad: result.tipo_novedad,
          subtipo: result.subtipo,
          valor: result.valor,
          dias: result.dias,
          timestamp: new Date().toISOString()
        });
        
        // ✅ V19.0: Toast de éxito inmediato como el código que funciona
        toast({
          title: "✅ Novedad creada exitosamente",
          description: `Se ha agregado la novedad de ${result.tipo_novedad} por ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(result.valor)}`,
          className: "border-green-200 bg-green-50"
        });
        
        await refetch();
        
        // ✅ V19.0: Retorno simple como el código que funciona
        return result;
      }
      
      throw new Error('Failed to create novedad');
    } catch (error: any) {
      console.error('❌ V20.0 DIAGNOSIS - useNovedades error creating novedad:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la novedad",
        variant: "destructive",
      });
      throw error;
    }
  }, [periodId, toast, refetch]);

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
      
      console.log('🔄 V20.0 DIAGNOSIS - useNovedades loadIntegratedNovedades called:', {
        employeeId,
        periodId,
        timestamp: new Date().toISOString()
      });

      // Usar el servicio simplificado que solo consulta payroll_novedades
      const unifiedData = await PayrollIntegratedDataService.getEmployeePeriodData(
        employeeId,
        periodId
      );

      console.log('✅ V20.0 DIAGNOSIS - useNovedades received unified data:', {
        totalElementos: unifiedData.length,
        novedades: unifiedData.filter(item => item.origen === 'novedades').length,
        ausenciasFragmentadas: unifiedData.filter(item => item.origen === 'vacaciones').length,
        incapacidades: unifiedData.filter(item => item.tipo_novedad === 'incapacidad').map(item => ({
          id: item.id,
          valor: item.valor,
          dias: item.dias,
          subtipo: item.subtipo
        })),
        timestamp: new Date().toISOString()
      });

      return unifiedData;
    } catch (error) {
      console.error('❌ V20.0 DIAGNOSIS - useNovedades error loading unified data:', error);
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
