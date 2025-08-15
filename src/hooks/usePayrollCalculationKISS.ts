
/**
 * ✅ HOOK SIMPLE PARA CÁLCULOS DE NÓMINA
 * Una sola responsabilidad: calcular nómina
 */

import { useState, useCallback } from 'react';
import { PayrollCalculationKISS, PayrollInputKISS, PayrollResultKISS } from '@/services/PayrollCalculationKISS';

export const usePayrollCalculationKISS = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<PayrollResultKISS | null>(null);

  const calculate = useCallback((input: PayrollInputKISS): PayrollResultKISS => {
    setIsCalculating(true);
    
    try {
      console.log('🎯 usePayrollCalculationKISS: Calculando...');
      const result = PayrollCalculationKISS.calculate(input);
      setLastCalculation(result);
      return result;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const calculateMultiple = useCallback((inputs: PayrollInputKISS[]): PayrollResultKISS[] => {
    setIsCalculating(true);
    
    try {
      console.log(`🎯 usePayrollCalculationKISS: Calculando ${inputs.length} empleados...`);
      const results = inputs.map(input => PayrollCalculationKISS.calculate(input));
      return results;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  return {
    calculate,
    calculateMultiple,
    isCalculating,
    lastCalculation
  };
};
