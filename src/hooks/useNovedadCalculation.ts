
import { useState, useEffect, useCallback } from 'react';
import { NovedadType } from '@/types/novedades-enhanced';
import { useNovedadBackendCalculation } from './useNovedadBackendCalculation';

interface UseNovedadCalculationProps {
  employeeSalary: number;
  periodoFecha?: Date;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

export const useNovedadCalculation = ({
  employeeSalary,
  periodoFecha,
  calculateSuggestedValue // ⚠️ DEPRECATED - mantenido por compatibilidad
}: UseNovedadCalculationProps) => {
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const { calculateNovedad, calculateNovedadDebounced, isLoading, error } = useNovedadBackendCalculation();

  const calculateValue = useCallback((
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number | null,
    dias?: number | null
  ) => {
    console.log('🧮 useNovedadCalculation - Calculating:', { 
      tipoNovedad, 
      subtipo, 
      horas, 
      dias, 
      employeeSalary,
      periodoFecha: periodoFecha?.toISOString().split('T')[0]
    });

    if (!employeeSalary || employeeSalary <= 0) {
      console.log('❌ Invalid salary for calculation');
      setCalculatedValue(null);
      return null;
    }

    // ✅ USAR BACKEND CALCULATION
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
