
/**
 * ⚠️ HOOK COMPLETAMENTE DEPRECADO
 * @deprecated Este hook ha sido eliminado completamente. 
 * USAR useNovedadBackendCalculation en su lugar.
 * Todos los cálculos ahora se realizan exclusivamente en el backend.
 */

import { useState, useEffect, useCallback } from 'react';
import { NovedadType } from '@/types/novedades-enhanced';
import { useNovedadBackendCalculation } from './useNovedadBackendCalculation';

interface UseNovedadCalculationProps {
  employeeSalary: number;
  periodoFecha?: Date;
  calculateSuggestedValue?: never; // ⚠️ DEPRECATED - eliminado completamente
}

export const useNovedadCalculation = ({
  employeeSalary,
  periodoFecha
}: UseNovedadCalculationProps) => {
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const { calculateNovedad, calculateNovedadDebounced, isLoading, error } = useNovedadBackendCalculation();

  const calculateValue = useCallback((
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number | null,
    dias?: number | null
  ) => {
    console.warn('⚠️ useNovedadCalculation está deprecado. Usar useNovedadBackendCalculation directamente.');
    
    if (!employeeSalary || employeeSalary <= 0) {
      console.log('❌ Invalid salary for calculation');
      setCalculatedValue(null);
      return null;
    }

    // ✅ SOLO BACKEND CALCULATION - sin cálculos frontend
    calculateNovedadDebounced(
      {
        tipoNovedad,
        subtipo,
        salarioBase: employeeSalary,
        horas: horas || undefined,
        dias: dias || undefined,
        fechaPeriodo: periodoFecha || new Date()
      },
      (result) => {
        if (result) {
          console.log('📊 Backend calculation result:', result.valor);
          setCalculatedValue(result.valor);
        } else {
          setCalculatedValue(null);
        }
      }
    );

    return null; // El resultado llegará de forma asíncrona
  }, [employeeSalary, periodoFecha, calculateNovedadDebounced]);

  return {
    calculatedValue,
    calculateValue,
    isLoading,
    error
  };
};
