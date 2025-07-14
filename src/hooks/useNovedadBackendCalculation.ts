
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NovedadType } from '@/types/novedades-enhanced';

interface NovedadCalculationInput {
  tipoNovedad: NovedadType;
  subtipo?: string;
  salarioBase: number;
  horas?: number;
  dias?: number;
  fechaPeriodo?: Date;
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
  // ✅ TEMPORALMENTE DESACTIVADO: Cache deshabilitado para debugging
  // const [cachedResults, setCachedResults] = useState<Map<string, NovedadCalculationResult>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout>();

  const calculateNovedad = useCallback(async (
    input: NovedadCalculationInput
  ): Promise<NovedadCalculationResult | null> => {
    
    // ✅ KISS: Sin caché temporalmente para debugging
    console.log('🎯 KISS DEBUG: Starting calculation with input:', {
      tipoNovedad: input.tipoNovedad,
      subtipo: input.subtipo,
      salarioBase: input.salarioBase,
      horas: input.horas,
      fechaPeriodo: input.fechaPeriodo
    });

    // Validaciones básicas
    if (!input.salarioBase || input.salarioBase <= 0) {
      console.log('❌ Invalid salary for calculation');
      return null;
    }

    const requiresHours = ['horas_extra', 'recargo_nocturno'].includes(input.tipoNovedad);
    const requiresDays = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'].includes(input.tipoNovedad);

    if (requiresHours && (!input.horas || input.horas <= 0)) {
      console.log('⏳ Waiting for hours input');
      return null;
    }

    if (requiresDays && (!input.dias || input.dias <= 0)) {
      console.log('⏳ Waiting for days input');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fechaParaCalculo = input.fechaPeriodo?.toISOString().split('T')[0];
      
      // ✅ KISS: Logging detallado de la fecha exacta
      console.log('🔍 KISS DEBUG: Fecha exacta enviada al backend:', fechaParaCalculo);
      console.log('🔍 KISS DEBUG: Fecha original del input:', input.fechaPeriodo);
      
      // ✅ VALIDACIÓN ESPECÍFICA CON LOGGING ULTRA-DETALLADO
      if (fechaParaCalculo === '2025-07-01') {
        console.log('🎯 KISS DEBUG: *** JULY 1, 2025 - ESPERANDO 230h mensuales ***');
      } else if (fechaParaCalculo === '2025-07-15') {
        console.log('🎯 KISS DEBUG: *** JULY 15, 2025 - ESPERANDO 220h mensuales ***');
      }

      const requestData = {
        tipoNovedad: input.tipoNovedad,
        subtipo: input.subtipo,
        salarioBase: input.salarioBase,
        horas: input.horas || undefined,
        dias: input.dias || undefined,
        fechaPeriodo: fechaParaCalculo || undefined
      };

      console.log('📤 KISS DEBUG: Request data completo:', requestData);

      const { data, error: apiError } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate-novedad',
          data: requestData
        }
      });

      if (apiError) {
        console.error('❌ API Error:', apiError);
        throw new Error('Error en el cálculo de novedad');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en el cálculo');
      }

      const result = data.data;
      
      // ✅ KISS: Logging ultra-detallado del resultado
      console.log('✅ KISS DEBUG: Backend result completo para', fechaParaCalculo, ':', {
        valor: result.valor,
        divisorHorario: result.jornadaInfo.divisorHorario,
        horasMensuales: result.jornadaInfo.horasMensuales,
        valorHoraOrdinaria: result.jornadaInfo.valorHoraOrdinaria,
        factorCalculo: result.factorCalculo,
        ley: result.jornadaInfo.ley
      });

      // ✅ VALIDACIÓN DE RESULTADOS ESPECÍFICOS MÁS ESTRICTA
      if (fechaParaCalculo === '2025-07-01') {
        if (result.jornadaInfo.divisorHorario !== 230) {
          console.error('❌ KISS ERROR: July 1 debe usar 230h, pero usa', result.jornadaInfo.divisorHorario, 'h');
        } else {
          console.log('✅ KISS SUCCESS: July 1 usa correctamente 230h mensuales');
        }
      } else if (fechaParaCalculo === '2025-07-15') {
        if (result.jornadaInfo.divisorHorario !== 220) {
          console.error('❌ KISS ERROR: July 15 debe usar 220h, pero usa', result.jornadaInfo.divisorHorario, 'h');
        } else {
          console.log('✅ KISS SUCCESS: July 15 usa correctamente 220h mensuales');
        }
      }

      // ✅ KISS: Sin caché por ahora - siempre calculamos fresco
      // console.log('💾 CACHING result for key:', cacheKey);
      // setCachedResults(prev => new Map(prev).set(cacheKey, result));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error in backend calculation:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []); // ✅ KISS: Removido cachedResults de dependencias

  const calculateNovedadDebounced = useCallback((
    input: NovedadCalculationInput,
    callback: (result: NovedadCalculationResult | null) => void,
    delay: number = 500
  ) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const result = await calculateNovedad(input);
      callback(result);
    }, delay);
  }, [calculateNovedad]);

  const clearCache = useCallback(() => {
    console.log('🗑️ KISS DEBUG: Cache clear called (but cache is disabled)');
    // setCachedResults(new Map()); // ✅ KISS: Cache deshabilitado
  }, []);

  return {
    calculateNovedad,
    calculateNovedadDebounced,
    isLoading,
    error,
    clearCache
  };
};
