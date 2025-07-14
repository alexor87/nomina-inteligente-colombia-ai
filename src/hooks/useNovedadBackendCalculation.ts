
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
      // ✅ SOLUCIÓN DIRECTA: Formateo garantizado de fecha
      let fechaParaCalculo: string | undefined;
      
      if (input.fechaPeriodo) {
        // Garantizar formato YYYY-MM-DD sin importar la zona horaria
        const year = input.fechaPeriodo.getFullYear();
        const month = String(input.fechaPeriodo.getMonth() + 1).padStart(2, '0');
        const day = String(input.fechaPeriodo.getDate()).padStart(2, '0');
        fechaParaCalculo = `${year}-${month}-${day}`;
        
        console.log('🔥 FRONTEND DIRECTO: Fecha original:', input.fechaPeriodo);
        console.log('🔥 FRONTEND DIRECTO: Fecha formateada FINAL:', fechaParaCalculo);
        
        // Validación inmediata en frontend
        if (fechaParaCalculo === '2025-07-15') {
          console.log('🔥 FRONTEND: 15 julio debe resultar en > $10,000');
        } else if (fechaParaCalculo === '2025-07-01') {
          console.log('🔥 FRONTEND: 1 julio debe resultar en ~$9,341');
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

      console.log('🔥 FRONTEND DIRECTO: Request final:', JSON.stringify(requestData, null, 2));

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
      
      console.log('🔥 FRONTEND DIRECTO: Resultado recibido:', {
        fechaEnviada: fechaParaCalculo,
        valorCalculado: result.valor,
        divisorHorario: result.jornadaInfo.divisorHorario,
        horasMensuales: result.jornadaInfo.horasMensuales
      });

      // Validación final
      if (fechaParaCalculo === '2025-07-15' && result.valor < 10000) {
        console.error('❌ ERROR: 15 julio debería ser > $10,000 pero es:', result.valor);
      } else if (fechaParaCalculo === '2025-07-01' && Math.abs(result.valor - 9341) > 100) {
        console.error('❌ ERROR: 1 julio debería ser ~$9,341 pero es:', result.valor);
      } else {
        console.log('✅ Resultado parece correcto para fecha:', fechaParaCalculo);
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
    console.log('🗑️ Cache disabled for debugging');
  }, []);

  return {
    calculateNovedad,
    calculateNovedadDebounced,
    isLoading,
    error,
    clearCache
  };
};
