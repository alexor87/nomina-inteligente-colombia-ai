
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
  const debounceRef = useRef<NodeJS.Timeout>();

  const calculateNovedad = useCallback(async (
    input: NovedadCalculationInput
  ): Promise<NovedadCalculationResult | null> => {
    
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
      // 🚀 ULTRA-KISS: Formateo garantizado y validación extrema
      let fechaParaCalculo: string | undefined;
      
      if (input.fechaPeriodo) {
        // Formateo manual garantizado YYYY-MM-DD
        const year = input.fechaPeriodo.getFullYear();
        const month = String(input.fechaPeriodo.getMonth() + 1).padStart(2, '0');
        const day = String(input.fechaPeriodo.getDate()).padStart(2, '0');
        fechaParaCalculo = `${year}-${month}-${day}`;
        
        console.log('🚀 ULTRA-KISS: *** FRONTEND PREPARANDO REQUEST ***');
        console.log('🚀 ULTRA-KISS: Fecha original:', input.fechaPeriodo);
        console.log('🚀 ULTRA-KISS: Fecha formateada FINAL:', fechaParaCalculo);
        
        // 🎯 Validación extrema de casos críticos
        if (fechaParaCalculo === '2025-07-15') {
          console.log('🎯 ULTRA-KISS: ✅ 15 julio → DEBE resultar en $9,765 (220h mensuales)');
        } else if (fechaParaCalculo === '2025-07-01') {
          console.log('🎯 ULTRA-KISS: ✅ 1 julio → DEBE resultar en $9,341 (230h mensuales)');
        }
      }

      const requestData = {
        tipoNovedad: input.tipoNovedad,
        subtipo: input.subtipo,
        salarioBase: input.salarioBase,
        horas: input.horas || undefined,
        dias: input.dias || undefined,
        fechaPeriodo: fechaParaCalculo
      };

      console.log('🚀 ULTRA-KISS: *** REQUEST FINAL ENVIADO ***');
      console.log('🚀 ULTRA-KISS:', JSON.stringify(requestData, null, 2));

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
      
      console.log('🚀 ULTRA-KISS: *** RESULTADO RECIBIDO DEL BACKEND ***');
      console.log('🚀 ULTRA-KISS: Fecha enviada:', fechaParaCalculo);
      console.log('🚀 ULTRA-KISS: Valor calculado:', result.valor);
      console.log('🚀 ULTRA-KISS: Divisor horario:', result.jornadaInfo.divisorHorario);
      console.log('🚀 ULTRA-KISS: Horas mensuales:', result.jornadaInfo.horasMensuales);

      // 🎯 VALIDACIÓN FINAL ULTRA-ESPECÍFICA
      if (fechaParaCalculo === '2025-07-15') {
        if (result.valor >= 9500) {
          console.log('✅ ULTRA-KISS SUCCESS: 15 julio valor correcto >= $9,500:', result.valor);
        } else {
          console.error('❌ ULTRA-KISS ERROR: 15 julio valor incorrecto < $9,500:', result.valor);
        }
      } else if (fechaParaCalculo === '2025-07-01') {
        if (Math.abs(result.valor - 9341) < 100) {
          console.log('✅ ULTRA-KISS SUCCESS: 1 julio valor correcto ~$9,341:', result.valor);
        } else {
          console.error('❌ ULTRA-KISS ERROR: 1 julio valor incorrecto ≠ $9,341:', result.valor);
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error in backend calculation:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    console.log('🚀 ULTRA-KISS: Cache permanentemente deshabilitado para máximo debugging');
  }, []);

  return {
    calculateNovedad,
    calculateNovedadDebounced,
    isLoading,
    error,
    clearCache
  };
};
