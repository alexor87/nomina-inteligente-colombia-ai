
import { useState, useCallback } from 'react';
import { PayrollCalculationSimple, SimplePayrollInput, SimplePayrollResult } from '@/services/PayrollCalculationSimple';

export const useSimplePayrollCalculation = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  
  const calculate = useCallback((input: SimplePayrollInput): SimplePayrollResult => {
    setIsCalculating(true);
    
    try {
      console.log('🎯 useSimplePayrollCalculation: Iniciando cálculo simple');
      const result = PayrollCalculationSimple.calculate(input);
      console.log('✅ useSimplePayrollCalculation: Cálculo completado');
      return result;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const shouldReceiveTransportAllowance = useCallback((salarioBase: number, year?: string): boolean => {
    return PayrollCalculationSimple.shouldReceiveTransportAllowance(salarioBase, year);
  }, []);

  const getConfigurationInfo = useCallback((year?: string) => {
    return PayrollCalculationSimple.getConfigurationInfo(year);
  }, []);

  return {
    calculate,
    shouldReceiveTransportAllowance,
    getConfigurationInfo,
    isCalculating
  };
};
