
import { useState, useEffect, useCallback } from 'react';
import { NovedadType } from '@/types/novedades-enhanced';
import { RecargosCalculationService } from '@/services/RecargosCalculationService';

interface UseNovedadCalculationProps {
  employeeSalary: number;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

export const useNovedadCalculation = ({
  employeeSalary,
  calculateSuggestedValue
}: UseNovedadCalculationProps) => {
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);

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
      employeeSalary 
    });

    if (!employeeSalary || employeeSalary <= 0) {
      console.log('❌ Invalid salary for calculation');
      setCalculatedValue(null);
      return null;
    }

    // ✅ SOLUCIÓN KISS: Usar servicio unificado para recargos
    if (tipoNovedad === 'recargo_nocturno' && subtipo && horas && horas > 0) {
      try {
        const result = RecargosCalculationService.calcularRecargo({
          salarioBase: employeeSalary,
          tipoRecargo: subtipo as any,
          horas: horas
        });
        
        console.log('📊 Recargo calculation result:', result.valorRecargo);
        setCalculatedValue(result.valorRecargo);
        return result.valorRecargo;
      } catch (error) {
        console.error('❌ Error in recargo calculation:', error);
        setCalculatedValue(null);
        return null;
      }
    }

    // Skip calculation if required inputs are missing
    const requiresHours = ['horas_extra'].includes(tipoNovedad);
    const requiresDays = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'ausencia'].includes(tipoNovedad);

    if (requiresHours && (!horas || horas <= 0)) {
      console.log('⏳ Waiting for hours input');
      setCalculatedValue(null);
      return null;
    }

    if (requiresDays && (!dias || dias <= 0)) {
      console.log('⏳ Waiting for days input');
      setCalculatedValue(null);
      return null;
    }

    try {
      if (calculateSuggestedValue) {
        const result = calculateSuggestedValue(
          tipoNovedad,
          subtipo,
          horas || undefined,
          dias || undefined
        );
        
        console.log('📊 Calculation result:', result);
        setCalculatedValue(result);
        return result;
      }
    } catch (error) {
      console.error('❌ Error in calculation:', error);
      setCalculatedValue(null);
      return null;
    }

    setCalculatedValue(null);
    return null;
  }, [employeeSalary, calculateSuggestedValue]);

  return {
    calculatedValue,
    calculateValue
  };
};
