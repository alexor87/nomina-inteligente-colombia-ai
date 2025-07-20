
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MultiPeriodAbsenceService } from '@/services/MultiPeriodAbsenceService';

interface PeriodDetectionResult {
  periodId: string | null;
  periodName: string | null;
  isExact: boolean;
  isAutoCreated: boolean;
  message: string;
  crossesMultiplePeriods?: boolean;
  periodSegments?: any[];
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
        isAutoCreated: false,
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

      // NUEVA FUNCIONALIDAD: Analizar si cruza múltiples períodos
      const multiPeriodAnalysis = await MultiPeriodAbsenceService.analyzeAbsenceAcrossPeriods(
        startDate, 
        endDate, 
        profile.company_id
      );

      console.log('🔍 Análisis multi-período:', multiPeriodAnalysis);

      // Si cruza múltiples períodos, informar al usuario
      if (multiPeriodAnalysis.crossesMultiplePeriods) {
        // Para ausencias multi-período, usar el primer período como referencia principal
        const primarySegment = multiPeriodAnalysis.segments[0];
        
        return {
          periodId: primarySegment.periodId,
          periodName: primarySegment.periodName,
          isExact: false,
          isAutoCreated: false,
          crossesMultiplePeriods: true,
          periodSegments: multiPeriodAnalysis.segments,
          message: `⚡ Ausencia multi-período detectada: ${multiPeriodAnalysis.segments.length} períodos afectados (${multiPeriodAnalysis.totalDays} días total)`
        };
      }

      // CORRECCIÓN: Buscar período único con filtro de duplicados mejorado
      const { data: allExactPeriods } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin, created_at')
        .eq('company_id', profile.company_id)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .order('created_at', { ascending: false });

      // Si hay múltiples períodos con las mismas fechas, usar el más reciente
      const exactPeriod = allExactPeriods?.[0];

      if (exactPeriod) {
        if (allExactPeriods && allExactPeriods.length > 1) {
          console.warn(`⚠️ ${allExactPeriods.length} períodos duplicados encontrados para fechas ${startDate} - ${endDate}, usando el más reciente`);
        }
        
        return {
          periodId: exactPeriod.id,
          periodName: exactPeriod.periodo,
          isExact: true,
          isAutoCreated: false,
          message: `Período exacto: ${exactPeriod.periodo}`
        };
      }

      // Buscar período que contenga las fechas de la ausencia (con filtro de duplicados)
      const { data: allContainingPeriods } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin, created_at')
        .eq('company_id', profile.company_id)
        .lte('fecha_inicio', startDate)
        .gte('fecha_fin', endDate)
        .order('created_at', { ascending: false });

      // Filtrar duplicados y usar el más reciente
      const containingPeriod = allContainingPeriods?.[0];

      if (containingPeriod) {
        if (allContainingPeriods && allContainingPeriods.length > 1) {
          console.warn(`⚠️ ${allContainingPeriods.length} períodos contenedores encontrados, usando el más reciente`);
        }
        
        return {
          periodId: containingPeriod.id,
          periodName: containingPeriod.periodo,
          isExact: false,
          isAutoCreated: false,
          message: `Período contenedor: ${containingPeriod.periodo}`
        };
      }

      // Crear período automáticamente usando detección inteligente
      const { data: smartPeriod } = await supabase.rpc('detect_current_smart_period');
      
      if (smartPeriod && typeof smartPeriod === 'object' && 'suggested_period' in smartPeriod) {
        const suggestedPeriod = (smartPeriod as any).suggested_period;
        const suggestedStart = suggestedPeriod.start_date;
        const suggestedEnd = suggestedPeriod.end_date;
        
        // Verificar si las fechas están dentro del período sugerido O crear un período personalizado
        let periodToCreate;
        let shouldCreateCustom = false;
        
        if (startDate >= suggestedStart && endDate <= suggestedEnd) {
          periodToCreate = {
            start_date: suggestedStart,
            end_date: suggestedEnd,
            period_name: suggestedPeriod.period_name,
            type: suggestedPeriod.type
          };
        } else {
          // Crear período personalizado que cubra las fechas seleccionadas
          shouldCreateCustom = true;
          const startMonth = new Date(startDate).getMonth() + 1;
          const startYear = new Date(startDate).getFullYear();
          const endMonth = new Date(endDate).getMonth() + 1;
          const endYear = new Date(endDate).getFullYear();
          
          periodToCreate = {
            start_date: startDate,
            end_date: endDate,
            period_name: startMonth === endMonth && startYear === endYear 
              ? `Período personalizado ${startMonth}/${startYear}`
              : `Período personalizado ${startDate} a ${endDate}`,
            type: 'personalizado'
          };
        }

        // Crear el período automáticamente
        const { data: createdPeriod, error: createError } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: profile.company_id,
            periodo: periodToCreate.period_name,
            fecha_inicio: periodToCreate.start_date,
            fecha_fin: periodToCreate.end_date,
            tipo_periodo: periodToCreate.type,
            estado: 'borrador', // Estado inicial
            empleados_count: 0,
            total_devengado: 0,
            total_deducciones: 0,
            total_neto: 0
          })
          .select('id, periodo')
          .single();

        if (createError) {
          console.error('Error creando período automático:', createError);
          throw createError;
        }

        return {
          periodId: createdPeriod.id,
          periodName: createdPeriod.periodo,
          isExact: !shouldCreateCustom,
          isAutoCreated: true,
          message: shouldCreateCustom 
            ? `Período personalizado creado: ${createdPeriod.periodo}`
            : `Período creado automáticamente: ${createdPeriod.periodo}`
        };
      }

      return {
        periodId: null,
        periodName: null,
        isExact: false,
        isAutoCreated: false,
        message: 'No se pudo crear período para las fechas especificadas'
      };

    } catch (error) {
      console.error('Error detecting period:', error);
      return {
        periodId: null,
        periodName: null,
        isExact: false,
        isAutoCreated: false,
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
