
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

  const generateCacheKey = useCallback((input: NovedadCalculationInput): string => {
    const dateStr = input.fechaPeriodo?.toISOString().split('T')[0] || 'current';
    const key = `${input.tipoNovedad}-${input.subtipo || 'none'}-${input.salarioBase}-${input.horas || 0}-${input.dias || 0}-${dateStr}`;
    
    // 🔍 DEBUG: Log cache key generation
    console.log('🔑 Generating cache key:', {
      input: {
        tipoNovedad: input.tipoNovedad,
        subtipo: input.subtipo,
        salarioBase: input.salarioBase,
        horas: input.horas,
        dias: input.dias,
        fechaPeriodo: input.fechaPeriodo,
        fechaPeriodoISO: input.fechaPeriodo?.toISOString()
      },
      cacheKey: key,
      dateStr
    });
    
    return key;
  }, []);

  const calculateNovedad = useCallback(async (
    input: NovedadCalculationInput
  ): Promise<NovedadCalculationResult | null> => {
    const cacheKey = generateCacheKey(input);
    
    // 🔍 DEBUG: Log input and cache check
    console.log('📊 calculateNovedad called with:', {
      input,
      fechaPeriodoDetails: {
        original: input.fechaPeriodo,
        iso: input.fechaPeriodo?.toISOString(),
        date: input.fechaPeriodo?.toISOString().split('T')[0],
        localeDateString: input.fechaPeriodo?.toLocaleDateString(),
        timestamp: input.fechaPeriodo?.getTime()
      },
      cacheKey,
      hasCachedResult: cachedResults.has(cacheKey)
    });
    
    // Verificar cache primero
    if (cachedResults.has(cacheKey)) {
      const cachedResult = cachedResults.get(cacheKey)!;
      console.log('🎯 Using cached result for:', cacheKey, cachedResult);
      return cachedResult;
    }

    // Validaciones básicas
    if (!input.salarioBase || input.salarioBase <= 0) {
      console.log('❌ Invalid salary for calculation');
      return null;
    }

    // Validar inputs requeridos según tipo
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
      console.log('🔄 Calculating novedad via backend:', input);

      const requestData = {
        tipoNovedad: input.tipoNovedad,
        subtipo: input.subtipo,
        salarioBase: input.salarioBase,
        horas: input.horas || undefined,
        dias: input.dias || undefined,
        fechaPeriodo: input.fechaPeriodo?.toISOString().split('T')[0] || undefined
      };

      // 🔍 DEBUG: Log request data being sent to backend
      console.log('📤 Sending to backend:', {
        requestData,
        originalFechaPeriodo: input.fechaPeriodo,
        processedFechaPeriodo: requestData.fechaPeriodo
      });

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
      console.log('✅ Backend calculation result:', {
        result,
        jornadaInfo: result.jornadaInfo,
        requestedDate: requestData.fechaPeriodo,
        calculatedValue: result.valor
      });

      // Guardar en cache
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
    // 🔍 DEBUG: Log debounced call
    console.log('⏱️ calculateNovedadDebounced called:', {
      input,
      delay,
      fechaPeriodo: input.fechaPeriodo?.toISOString()
    });
    
    // Limpiar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Configurar nuevo debounce
    debounceRef.current = setTimeout(async () => {
      console.log('🚀 Debounce timeout executed, calling calculateNovedad');
      const result = await calculateNovedad(input);
      callback(result);
    }, delay);
  }, [calculateNovedad]);

  const clearCache = useCallback(() => {
    console.log('🧹 Clearing novedad calculation cache');
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
