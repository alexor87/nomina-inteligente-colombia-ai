
/**
 * ⚠️ HOOK MARCADO COMO OBSOLETO - REPARACIÓN CRÍTICA
 * Este hook será reemplazado por usePayrollDomain
 */

import { usePayrollDomain } from './usePayrollDomain';

export const usePayrollLiquidationNew = () => {
  console.warn('⚠️ usePayrollLiquidationNew está obsoleto. Usar usePayrollDomain');
  
  const {
    currentPeriod,
    periodSituation,
    isLoading,
    detectPeriodSituation,
    createPeriod,
    closePeriod
  } = usePayrollDomain();

  return {
    currentPeriod,
    periodSituation,
    isLoading,
    detectPeriodSituation,
    createPeriod,
    closePeriod
  };
};
