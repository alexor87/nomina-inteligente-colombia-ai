
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
  const [cachedResults, setCachedResults] = useState<Map<string, NovedadCalculationResult>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout>();

  // ✅ CORRECCIÓN CRÍTICA: Cache key debe incluir fecha correctamente
  const generateCacheKey = useCallback((input: NovedadCalculationInput): string => {
    const dateStr = input.fechaPeriodo ? input.fechaPeriodo.toISOString().split('T')[0] : 'no-date';
    const key = `${input.tipoNovedad}-${input.subtipo || 'none'}-${input.salarioBase}-${input.horas || 0}-${input.dias || 0}-${dateStr}`;
    console.log(`🔑 CACHE KEY GENERATED: ${key}`);
    return key;
  }, []);

  const calculateNovedad = useCallback(async (
    input: NovedadCalculationInput
  ): Promise<NovedadCalculationResult | null> => {
    const cacheKey = generateCacheKey(input);
    
    // ✅ VERIFICAR CACHE CON LOGGING
    if (cachedResults.has(cacheKey)) {
      const cachedResult = cachedResults.get(cacheKey)!;
      console.log(`🎯 USING CACHED RESULT for key: ${cacheKey}`);
      console.log(`   Cached value: ${cachedResult.valor}, divisor: ${cachedResult.jornadaInfo.divisorHorario}`);
      return cachedResult;
    }

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
      console.log(`🔄 FRONTEND: Calculating novedad via backend for date: ${fechaParaCalculo}`);
      
      // ✅ VALIDACIÓN ESPECÍFICA CON LOGGING DETALLADO
      if (fechaParaCalculo === '2025-07-01') {
        console.log(`🔍 FRONTEND: *** JULY 1, 2025 - EXPECTING 230h monthly ***`);
      } else if (fechaParaCalculo === '2025-07-15') {
        console.log(`🔍 FRONTEND: *** JULY 15, 2025 - EXPECTING 220h monthly ***`);
      }

      const requestData = {
        tipoNovedad: input.tipoNovedad,
        subtipo: input.subtipo,
        salarioBase: input.salarioBase,
        horas: input.horas || undefined,
        dias: input.dias || undefined,
        fechaPeriodo: fechaParaCalculo || undefined
      };

      console.log(`📤 FRONTEND: Request data:`, requestData);

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
      console.log(`✅ FRONTEND: Backend result for ${fechaParaCalculo}:`, {
        valor: result.valor,
        divisorHorario: result.jornadaInfo.divisorHorario,
        valorHoraOrdinaria: result.jornadaInfo.valorHoraOrdinaria,
        factorCalculo: result.factorCalculo
      });

      // ✅ VALIDACIÓN DE RESULTADOS ESPECÍFICOS
      if (fechaParaCalculo === '2025-07-01' && result.jornadaInfo.divisorHorario !== 230) {
        console.error(`❌ FRONTEND ERROR: July 1 should use 230h, got ${result.jornadaInfo.divisorHorario}h`);
      } else if (fechaParaCalculo === '2025-07-15' && result.jornadaInfo.divisorHorario !== 220) {
        console.error(`❌ FRONTEND ERROR: July 15 should use 220h, got ${result.jornadaInfo.divisorHorario}h`);
      } else if (['2025-07-01', '2025-07-15'].includes(fechaParaCalculo || '')) {
        console.log(`✅ FRONTEND: Correct - ${fechaParaCalculo} uses ${result.jornadaInfo.divisorHorario}h monthly`);
      }

      // ✅ GUARDAR EN CACHE CON LOGGING
      console.log(`💾 CACHING result for key: ${cacheKey}`);
      setCachedResults(prev => new Map(prev).set(cacheKey, result));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error in backend calculation:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [generateCacheKey, cachedResults]);

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
    console.log('🗑️ CLEARING novedad calculation cache');
    setCachedResults(new Map());
  }, []);

  return {
    calculateNovedad,
    calculateNovedadDebounced,
    isLoading,
    error,
    clearCache
  };
};
