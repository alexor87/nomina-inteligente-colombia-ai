
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
      // ✅ SOLUCIÓN DEFINITIVA: Formateo ultra-garantizado de fecha
      let fechaParaCalculo: string | undefined;
      
      if (input.fechaPeriodo) {
        // Formateo manual garantizado YYYY-MM-DD
        const year = input.fechaPeriodo.getFullYear();
        const month = String(input.fechaPeriodo.getMonth() + 1).padStart(2, '0');
        const day = String(input.fechaPeriodo.getDate()).padStart(2, '0');
        fechaParaCalculo = `${year}-${month}-${day}`;
        
        console.log('🎯 DEFINITIVO FRONTEND: Fecha original:', input.fechaPeriodo);
        console.log('🎯 DEFINITIVO FRONTEND: Fecha formateada FINAL:', fechaParaCalculo);
        
        // Validación específica para casos críticos
        if (fechaParaCalculo === '2025-07-15') {
          console.log('🎯 DEFINITIVO FRONTEND: ✅ 15 julio → debe resultar en > $10,000 (220h mensuales)');
        } else if (fechaParaCalculo === '2025-07-01') {
          console.log('🎯 DEFINITIVO FRONTEND: ✅ 1 julio → debe resultar en $9,341 (230h mensuales)');
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

      console.log('🎯 DEFINITIVO FRONTEND: Request final enviado:', JSON.stringify(requestData, null, 2));

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
      
      console.log('🎯 DEFINITIVO FRONTEND: *** RESULTADO RECIBIDO ***');
      console.log('🎯 DEFINITIVO FRONTEND: Fecha enviada:', fechaParaCalculo);
      console.log('🎯 DEFINITIVO FRONTEND: Valor calculado:', result.valor);
      console.log('🎯 DEFINITIVO FRONTEND: Divisor horario:', result.jornadaInfo.divisorHorario);
      console.log('🎯 DEFINITIVO FRONTEND: Horas mensuales:', result.jornadaInfo.horasMensuales);

      // ✅ Validación final ultra-específica
      if (fechaParaCalculo === '2025-07-15') {
        if (result.valor > 9500) {
          console.log('🎯 DEFINITIVO FRONTEND: ✅ ÉXITO 15 julio: Valor correcto > $9,500:', result.valor);
        } else {
          console.error('🎯 DEFINITIVO FRONTEND: ❌ ERROR 15 julio: Valor incorrecto < $9,500:', result.valor);
        }
      } else if (fechaParaCalculo === '2025-07-01') {
        if (Math.abs(result.valor - 9341) < 100) {
          console.log('🎯 DEFINITIVO FRONTEND: ✅ ÉXITO 1 julio: Valor correcto ~$9,341:', result.valor);
        } else {
          console.error('🎯 DEFINITIVO FRONTEND: ❌ ERROR 1 julio: Valor incorrecto ≠ $9,341:', result.valor);
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
    console.log('🎯 DEFINITIVO FRONTEND: Cache permanentemente deshabilitado para debugging');
  }, []);

  return {
    calculateNovedad,
    calculateNovedadDebounced,
    isLoading,
    error,
    clearCache
  };
};
