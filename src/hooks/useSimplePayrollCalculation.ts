
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

  const shouldReceiveTransportAllowance = useCallback((salarioBase: number): boolean => {
    return PayrollCalculationSimple.shouldReceiveTransportAllowance(salarioBase);
  }, []);

  const getConfigurationInfo = useCallback(() => {
    return PayrollCalculationSimple.getConfigurationInfo();
  }, []);

  return {
    calculate,
    shouldReceiveTransportAllowance,
    getConfigurationInfo,
    isCalculating
  };
};
