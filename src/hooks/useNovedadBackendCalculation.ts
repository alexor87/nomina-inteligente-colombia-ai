
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
    
    // ✅ KISS: Validaciones básicas
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
      // ✅ KISS: FORZAR FORMATO YYYY-MM-DD CORRECTO
      let fechaParaCalculo: string | undefined;
      
      if (input.fechaPeriodo) {
        // Crear fecha limpia en UTC para evitar problemas de zona horaria
        const year = input.fechaPeriodo.getFullYear();
        const month = String(input.fechaPeriodo.getMonth() + 1).padStart(2, '0');
        const day = String(input.fechaPeriodo.getDate()).padStart(2, '0');
        fechaParaCalculo = `${year}-${month}-${day}`;
        
        console.log('🎯 KISS FRONTEND: Fecha original input:', input.fechaPeriodo);
        console.log('🎯 KISS FRONTEND: Fecha formateada para backend:', fechaParaCalculo);
        console.log('🎯 KISS FRONTEND: Año:', year, 'Mes:', month, 'Día:', day);
        
        // ✅ VALIDACIÓN CRÍTICA EN FRONTEND
        if (fechaParaCalculo === '2025-07-15') {
          console.log('🎯 KISS FRONTEND: *** 15 JULIO 2025 - DEBE USAR 220h MENSUALES ***');
          console.log('🎯 KISS FRONTEND: Valor esperado: ~$10,150 (superior a $9,341)');
        } else if (fechaParaCalculo === '2025-07-01') {
          console.log('🎯 KISS FRONTEND: *** 1 JULIO 2025 - DEBE USAR 230h MENSUALES ***');
          console.log('🎯 KISS FRONTEND: Valor esperado: $9,341');
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

      console.log('📤 KISS FRONTEND: Request data enviado al backend:', JSON.stringify(requestData, null, 2));

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
      
      console.log('✅ KISS FRONTEND: Resultado recibido del backend:', {
        fechaEnviada: fechaParaCalculo,
        valorCalculado: result.valor,
        divisorHorario: result.jornadaInfo.divisorHorario,
        horasMensuales: result.jornadaInfo.horasMensuales,
        valorHoraOrdinaria: result.jornadaInfo.valorHoraOrdinaria,
        ley: result.jornadaInfo.ley
      });

      // ✅ VALIDACIÓN FINAL DE RESULTADOS
      if (fechaParaCalculo === '2025-07-15') {
        const valorEsperado = Math.round((input.salarioBase / 220) * 1.25 * (input.horas || 0));
        console.log('🔍 KISS FRONTEND: 15 julio - Valor esperado:', valorEsperado, 'Valor recibido:', result.valor);
        
        if (result.jornadaInfo.divisorHorario !== 220) {
          console.error('❌ KISS ERROR: 15 julio debe usar 220h, pero recibió', result.jornadaInfo.divisorHorario, 'h');
        } else {
          console.log('✅ KISS SUCCESS: 15 julio usa correctamente 220h mensuales');
        }
      } else if (fechaParaCalculo === '2025-07-01') {
        const valorEsperado = Math.round((input.salarioBase / 230) * 1.25 * (input.horas || 0));
        console.log('🔍 KISS FRONTEND: 1 julio - Valor esperado:', valorEsperado, 'Valor recibido:', result.valor);
        
        if (result.jornadaInfo.divisorHorario !== 230) {
          console.error('❌ KISS ERROR: 1 julio debe usar 230h, pero recibió', result.jornadaInfo.divisorHorario, 'h');
        } else {
          console.log('✅ KISS SUCCESS: 1 julio usa correctamente 230h mensuales');
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
    console.log('🗑️ KISS: Cache clear called (cache disabled for debugging)');
  }, []);

  return {
    calculateNovedad,
    calculateNovedadDebounced,
    isLoading,
    error,
    clearCache
  };
};
