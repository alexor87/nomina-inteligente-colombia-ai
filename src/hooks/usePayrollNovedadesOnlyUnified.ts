
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { DisplayNovedad } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';

export const usePayrollNovedadesOnlyUnified = (
  companyId: string,
  periodId: string
) => {
  const [novedades, setNovedades] = useState<DisplayNovedad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // ✅ CARGAR SOLO NOVEDADES - FUENTE ÚNICA DE VERDAD
  const loadNovedades = useCallback(async () => {
    if (!companyId || !periodId) return;

    setIsLoading(true);
    try {
      console.log('🔄 Loading novedades (single source of truth)...');
      
      const rawNovedades = await NovedadesEnhancedService.getNovedades(companyId, periodId);
      
      // Convertir a DisplayNovedad para consistencia
      const displayNovedades: DisplayNovedad[] = rawNovedades.map(novedad => ({
        id: novedad.id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        subtipo: novedad.subtipo,
        valor: novedad.valor,
        dias: novedad.dias,
        horas: novedad.horas,
        observacion: novedad.observacion,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        
        // Metadatos
        origen: 'novedades',
        status: 'registrada',
        processed_in_period_id: novedad.periodo_id,
        isConfirmed: true,
        
        // Permisos
        canEdit: true,
        canDelete: true,
        
        // Visualización
        badgeColor: 'bg-blue-100 text-blue-800',
        badgeIcon: '📋',
        badgeLabel: 'Novedad',
        statusColor: 'bg-blue-100 text-blue-800',
        
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      }));

      setNovedades(displayNovedades);
      
      console.log(`✅ Loaded ${displayNovedades.length} novedades`);
      
    } catch (error) {
      console.error('❌ Error loading novedades:', error);
      toast({
        title: "Error",
        description: "Error al cargar novedades",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, periodId, toast]);

  // Cargar al inicializar
  useEffect(() => {
    loadNovedades();
  }, [loadNovedades]);

  // ✅ REALTIME: Escuchar cambios en novedades
  useEffect(() => {
    if (!companyId || !periodId) return;

    const channel = supabase
      .channel('novedades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payroll_novedades',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('🔄 Novedades realtime update:', payload);
          loadNovedades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, periodId, loadNovedades]);

  return {
    novedades,
    isLoading,
    loadNovedades,
    // Estadísticas
    totalNovedades: novedades.length,
    totalValor: novedades.reduce((sum, n) => sum + (n.valor || 0), 0),
    totalDias: novedades.reduce((sum, n) => sum + (n.dias || 0), 0)
  };
};
