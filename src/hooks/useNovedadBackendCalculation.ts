
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

  // ✅ CORRECCIÓN: Mejorar validación y logging para incapacidades
  const calculateNovedad = useCallback(async (
    input: NovedadCalculationInput
  ): Promise<NovedadCalculationResult | null> => {
    
    if (!input.salarioBase || input.salarioBase <= 0) {
      console.log('❌ Invalid salary for calculation:', input.salarioBase);
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

    // ✅ NUEVO: Logging específico para incapacidades
    if (input.tipoNovedad === 'incapacidad') {
      console.log('🏥 INCAPACIDAD CALCULATION:', {
        tipo: input.tipoNovedad,
        subtipo: input.subtipo || 'general',
        salarioBase: input.salarioBase,
        dias: input.dias,
        fechaPeriodo: input.fechaPeriodo
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
        dias: input.dias || undefined,
        fechaPeriodo: fechaParaCalculo
      };

      console.log('🚀 HOOK: Enviando request al backend:', requestData);

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
        console.error('❌ Backend calculation failed:', data.error);
        throw new Error(data.error || 'Error desconocido en el cálculo');
      }

      const result = data.data;
      
      console.log('✅ HOOK SUCCESS:', {
        tipo: input.subtipo || input.tipoNovedad,
        valor: result.valor,
        factor: result.factorCalculo,
        detalle: result.detalleCalculo
      });

      // ✅ NUEVO: Logging específico para incapacidades
      if (input.tipoNovedad === 'incapacidad') {
        console.log('🏥 INCAPACIDAD RESULT:', {
          valorCalculado: result.valor,
          detalleCalculo: result.detalleCalculo,
          subtipo: input.subtipo || 'general'
        });
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

  // ✅ CORRECCIÓN: Debounce mejorado con callback inmediato
  const calculateNovedadDebounced = useCallback((
    input: NovedadCalculationInput,
    callback: (result: NovedadCalculationResult | null) => void,
    delay: number = 300
  ) => {
    // Limpiar timeout previo
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // ✅ CORRECCIÓN: Ejecutar inmediatamente si tenemos todos los datos necesarios
    const hasRequiredData = input.salarioBase > 0 && (
      (['horas_extra', 'recargo_nocturno'].includes(input.tipoNovedad) && input.horas && input.horas > 0) ||
      (['incapacidad', 'vacaciones', 'licencia_remunerada', 'ausencia'].includes(input.tipoNovedad) && input.dias && input.dias > 0) ||
      (!['horas_extra', 'recargo_nocturno', 'incapacidad', 'vacaciones', 'licencia_remunerada', 'ausencia'].includes(input.tipoNovedad))
    );

    if (hasRequiredData) {
      // ✅ Ejecutar inmediatamente para mejor UX
      console.log('⚡ IMMEDIATE CALCULATION for:', input.tipoNovedad);
      calculateNovedad(input).then(callback);
    } else {
      // ✅ Usar debounce solo cuando faltan datos
      console.log('⏳ DEBOUNCED CALCULATION for:', input.tipoNovedad, 'missing data');
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
