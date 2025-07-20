
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PeriodDetectionResult {
  periodId: string | null;
  periodName: string | null;
  isExact: boolean;
  message: string;
}

export const usePeriodDetection = () => {
  const { user } = useAuth();
  const [isDetecting, setIsDetecting] = useState(false);

  const detectPeriodForDates = useCallback(async (
    startDate: string, 
    endDate: string
  ): Promise<PeriodDetectionResult> => {
    if (!user) {
      return {
        periodId: null,
        periodName: null,
        isExact: false,
        message: 'Usuario no autenticado'
      };
    }

    setIsDetecting(true);
    
    try {
      // Obtener company_id del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Usuario no tiene empresa asignada');
      }

      // Buscar período que contenga exactamente las fechas
      const { data: exactPeriod } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin')
        .eq('company_id', profile.company_id)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exactPeriod) {
        return {
          periodId: exactPeriod.id,
          periodName: exactPeriod.periodo,
          isExact: true,
          message: `Período exacto encontrado: ${exactPeriod.periodo}`
        };
      }

      // Buscar período que contenga las fechas de la ausencia
      const { data: containingPeriod } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin')
        .eq('company_id', profile.company_id)
        .lte('fecha_inicio', startDate)
        .gte('fecha_fin', endDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (containingPeriod) {
        return {
          periodId: containingPeriod.id,
          periodName: containingPeriod.periodo,
          isExact: false,
          message: `Período contenedor encontrado: ${containingPeriod.periodo}`
        };
      }

      // Si no se encuentra ningún período, usar detección inteligente
      const { data: smartPeriod } = await supabase.rpc('detect_current_smart_period');
      
      if (smartPeriod?.suggested_period) {
        const suggestedStart = smartPeriod.suggested_period.start_date;
        const suggestedEnd = smartPeriod.suggested_period.end_date;
        
        // Verificar si las fechas están dentro del período sugerido
        if (startDate >= suggestedStart && endDate <= suggestedEnd) {
          // Buscar o crear período sugerido
          const { data: suggestedPeriodDb } = await supabase
            .from('payroll_periods_real')
            .select('id, periodo')
            .eq('company_id', profile.company_id)
            .eq('fecha_inicio', suggestedStart)
            .eq('fecha_fin', suggestedEnd)
            .maybeSingle();

          if (suggestedPeriodDb) {
            return {
              periodId: suggestedPeriodDb.id,
              periodName: suggestedPeriodDb.periodo,
              isExact: false,
              message: `Período sugerido encontrado: ${suggestedPeriodDb.periodo}`
            };
          }
        }
      }

      return {
        periodId: null,
        periodName: null,
        isExact: false,
        message: 'No se encontró período para las fechas especificadas'
      };

    } catch (error) {
      console.error('Error detecting period:', error);
      return {
        periodId: null,
        periodName: null,
        isExact: false,
        message: 'Error detectando período'
      };
    } finally {
      setIsDetecting(false);
    }
  }, [user]);

  return {
    detectPeriodForDates,
    isDetecting
  };
};
