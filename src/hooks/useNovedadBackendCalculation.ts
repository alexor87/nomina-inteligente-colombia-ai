
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
    return `${input.tipoNovedad}-${input.subtipo || 'none'}-${input.salarioBase}-${input.horas || 0}-${input.dias || 0}-${dateStr}`;
  }, []);

  const calculateNovedad = useCallback(async (
    input: NovedadCalculationInput
  ): Promise<NovedadCalculationResult | null> => {
    const cacheKey = generateCacheKey(input);
    
    // Verificar cache primero
    if (cachedResults.has(cacheKey)) {
      console.log('🎯 KISS: Using cached result for:', cacheKey);
      return cachedResults.get(cacheKey)!;
    }

    // Validaciones básicas
    if (!input.salarioBase || input.salarioBase <= 0) {
      console.log('❌ KISS: Invalid salary for calculation');
      return null;
    }

    // Validar inputs requeridos según tipo
    const requiresHours = ['horas_extra', 'recargo_nocturno'].includes(input.tipoNovedad);
    const requiresDays = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'].includes(input.tipoNovedad);

    if (requiresHours && (!input.horas || input.horas <= 0)) {
      console.log('⏳ KISS: Waiting for hours input');
      return null;
    }

    if (requiresDays && (!input.dias || input.dias <= 0)) {
      console.log('⏳ KISS: Waiting for days input');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ✅ KISS: Fecha simple como string YYYY-MM-DD
      const fechaParaCalculo = input.fechaPeriodo?.toISOString().split('T')[0];
      console.log('🔄 KISS FRONTEND: Calculating novedad via backend:', {
        ...input,
        fechaPeriodo: fechaParaCalculo
      });

      // ✅ KISS: Validación específica simple - CORREGIDA
      if (fechaParaCalculo === '2025-07-01') {
        console.log('🔍 KISS FRONTEND: *** ENVIANDO FECHA 1 JULIO 2025 - ESPERAMOS 230h ***');
      } else if (fechaParaCalculo === '2025-07-15') {
        console.log('🔍 KISS FRONTEND: *** ENVIANDO FECHA 15 JULIO 2025 - ESPERAMOS 220h ***');
      } else if (fechaParaCalculo === '2025-07-16') {
        console.log('🔍 KISS FRONTEND: *** ENVIANDO FECHA 16 JULIO 2025 - ESPERAMOS 220h ***');
      } else if (fechaParaCalculo === '2025-07-17') {
        console.log('🔍 KISS FRONTEND: *** ENVIANDO FECHA 17 JULIO 2025 - ESPERAMOS 220h ***');
      }

      const requestData = {
        tipoNovedad: input.tipoNovedad,
        subtipo: input.subtipo,
        salarioBase: input.salarioBase,
        horas: input.horas || undefined,
        dias: input.dias || undefined,
        fechaPeriodo: fechaParaCalculo || undefined
      };

      console.log('📤 KISS FRONTEND: Request data being sent to backend:', requestData);

      const { data, error: apiError } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate-novedad',
          data: requestData
        }
      });

      if (apiError) {
        console.error('❌ KISS API Error:', apiError);
        throw new Error('Error en el cálculo de novedad');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en el cálculo');
      }

      const result = data.data;
      console.log('✅ KISS FRONTEND: Backend calculation result:', result);

      // ✅ KISS: Validación de resultados específicos - CORREGIDA
      if (fechaParaCalculo === '2025-07-01' && result.jornadaInfo.divisorHorario !== 230) {
        console.error(`❌ KISS FRONTEND: ERROR - 1 julio debería usar 230h, pero recibió ${result.jornadaInfo.divisorHorario}h`);
      } else if (fechaParaCalculo === '2025-07-15' && result.jornadaInfo.divisorHorario !== 220) {
        console.error(`❌ KISS FRONTEND: ERROR - 15 julio debería usar 220h, pero recibió ${result.jornadaInfo.divisorHorario}h`);
      } else if (fechaParaCalculo === '2025-07-16' && result.jornadaInfo.divisorHorario !== 220) {
        console.error(`❌ KISS FRONTEND: ERROR - 16 julio debería usar 220h, pero recibió ${result.jornadaInfo.divisorHorario}h`);
      } else if (fechaParaCalculo === '2025-07-17' && result.jornadaInfo.divisorHorario !== 220) {
        console.error(`❌ KISS FRONTEND: ERROR - 17 julio debería usar 220h, pero recibió ${result.jornadaInfo.divisorHorario}h`);
      } else if (['2025-07-01', '2025-07-15', '2025-07-16', '2025-07-17'].includes(fechaParaCalculo || '')) {
        console.log(`✅ KISS FRONTEND: Correcto - ${fechaParaCalculo} usa ${result.jornadaInfo.divisorHorario}h mensuales`);
      }

      // Guardar en cache
      setCachedResults(prev => new Map(prev).set(cacheKey, result));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ KISS Error in backend calculation:', errorMessage);
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
    // Limpiar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Configurar nuevo debounce
    debounceRef.current = setTimeout(async () => {
      const result = await calculateNovedad(input);
      callback(result);
    }, delay);
  }, [calculateNovedad]);

  const clearCache = useCallback(() => {
    console.log('🗑️ KISS: Clearing novedad calculation cache');
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
