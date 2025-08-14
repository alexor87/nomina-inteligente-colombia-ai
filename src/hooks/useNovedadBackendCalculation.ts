
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NovedadType } from '@/types/novedades-enhanced';

interface NovedadCalculationInput {
  tipoNovedad: NovedadType;
  subtipo?: string;
  salarioBase: number;
  horas?: number;
  dias?: number;
  valorManual?: number;
  cuotas?: number;
  fechaPeriodo?: string;
}

interface NovedadCalculationResult {
  valor: number;
  factorCalculo: number;
  detalleCalculo: string;
  jornadaInfo: {
    horasSemanales: number;
    horasMensuales: number;
    divisorHorario: number;
    valorHoraOrdinaria: number;
    ley: string;
    descripcion: string;
  };
}

export const useNovedadBackendCalculation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // ✅ CORRECCIÓN V3.0: Validación específica mejorada para incapacidades
  const calculateNovedad = useCallback(async (
    input: NovedadCalculationInput
  ): Promise<NovedadCalculationResult | null> => {
    
    if (!input.salarioBase || input.salarioBase <= 0) {
      console.log('❌ [V3.0] Invalid salary for calculation:', input.salarioBase);
      return null;
    }

    const requiresHours = ['horas_extra', 'recargo_nocturno'].includes(input.tipoNovedad);
    const requiresDays = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'].includes(input.tipoNovedad);

    if (requiresHours && (!input.horas || input.horas <= 0)) {
      console.log('⏳ [V3.0] Waiting for hours input');
      return null;
    }

    // ✅ CORRECCIÓN CRÍTICA V3.0: Para incapacidades, permitir dias = 0 (es válido para 1-3 días)
    if (requiresDays && input.tipoNovedad !== 'incapacidad' && (!input.dias || input.dias <= 0)) {
      console.log('⏳ [V3.0] Waiting for days input (non-incapacidad)');
      return null;
    }

    // ✅ CORRECCIÓN ESPECÍFICA V3.0: Para incapacidades, validar que dias esté definido (puede ser 0)
    if (input.tipoNovedad === 'incapacidad' && (input.dias === undefined || input.dias === null || input.dias < 0)) {
      console.log('⏳ [V3.0] Incapacidad: waiting for valid days input (undefined/null/negative)');
      return null;
    }

    // ✅ LOGGING ESPECÍFICO V3.0 para incapacidades
    if (input.tipoNovedad === 'incapacidad') {
      console.log('🏥 [V3.0] INCAPACIDAD CALCULATION - Input válido:', {
        tipo: input.tipoNovedad,
        subtipo: input.subtipo || 'general',
        salarioBase: input.salarioBase,
        dias: input.dias, // ✅ Puede ser 0 para 1-3 días
        fechaPeriodo: input.fechaPeriodo,
        validacion_passed: true
      });
    }

    setIsLoading(true);
    setError(null);

    try {
      // ✅ CORRECCIÓN: Formateo UTC simple
      let fechaParaCalculo: string | undefined;
      
      if (input.fechaPeriodo) {
        fechaParaCalculo = input.fechaPeriodo.split('T')[0];
      }

      const requestData = {
        tipoNovedad: input.tipoNovedad,
        subtipo: input.subtipo || (input.tipoNovedad === 'incapacidad' ? 'general' : undefined),
        salarioBase: input.salarioBase,
        horas: input.horas || undefined,
        dias: input.dias, // ✅ V3.0: Preservar dias incluso si es 0
        fechaPeriodo: fechaParaCalculo
      };

      console.log('🚀 [V3.0] HOOK: Enviando request al backend:', requestData);

      const { data, error: apiError } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate-novedad',
          data: requestData
        }
      });

      if (apiError) {
        console.error('❌ [V3.0] API Error:', apiError);
        throw new Error('Error en el cálculo de novedad');
      }

      if (!data.success) {
        console.error('❌ [V3.0] Backend calculation failed:', data.error);
        throw new Error(data.error || 'Error desconocido en el cálculo');
      }

      const result = data.data;
      
      console.log('✅ [V3.0] HOOK SUCCESS:', {
        tipo: input.subtipo || input.tipoNovedad,
        dias_enviados: input.dias,
        valor: result.valor,
        factor: result.factorCalculo,
        detalle: result.detalleCalculo
      });

      // ✅ LOGGING ESPECÍFICO V3.0 para incapacidades
      if (input.tipoNovedad === 'incapacidad') {
        console.log('🏥 [V3.0] INCAPACIDAD RESULT:', {
          dias_enviados: input.dias,
          valorCalculado: result.valor,
          detalleCalculo: result.detalleCalculo,
          subtipo: input.subtipo || 'general',
          es_correcto: input.dias > 3 ? result.valor > 0 : result.valor === 0
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [V3.0] Error in backend calculation:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ CORRECCIÓN V3.0: Debounce mejorado con validación específica para incapacidades
  const calculateNovedadDebounced = useCallback((
    input: NovedadCalculationInput,
    callback: (result: NovedadCalculationResult | null) => void,
    delay: number = 300
  ) => {
    // Limpiar timeout previo
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // ✅ CORRECCIÓN V3.0: Validación específica mejorada
    const hasRequiredData = input.salarioBase > 0 && (
      (['horas_extra', 'recargo_nocturno'].includes(input.tipoNovedad) && input.horas && input.horas > 0) ||
      // ✅ Para incapacidades: permitir dias >= 0 (incluso 0 es válido)
      (input.tipoNovedad === 'incapacidad' && input.dias !== undefined && input.dias !== null && input.dias >= 0) ||
      (['vacaciones', 'licencia_remunerada', 'ausencia'].includes(input.tipoNovedad) && input.dias && input.dias > 0) ||
      (!['horas_extra', 'recargo_nocturno', 'incapacidad', 'vacaciones', 'licencia_remunerada', 'ausencia'].includes(input.tipoNovedad))
    );

    if (hasRequiredData) {
      // ✅ Ejecutar inmediatamente para mejor UX
      console.log('⚡ [V3.0] IMMEDIATE CALCULATION for:', input.tipoNovedad, 'with dias:', input.dias);
      calculateNovedad(input).then(callback);
    } else {
      // ✅ Usar debounce solo cuando faltan datos
      console.log('⏳ [V3.0] DEBOUNCED CALCULATION for:', input.tipoNovedad, 'missing data, dias:', input.dias);
      debounceRef.current = setTimeout(async () => {
        const result = await calculateNovedad(input);
        callback(result);
      }, delay);
    }
  }, [calculateNovedad]);

  return {
    calculateNovedad,
    calculateNovedadDebounced,
    isLoading,
    error
  };
};
