import React, { useEffect } from 'react';
import { useMaya } from './MayaProvider';

interface MayaIntegratedComponentProps {
  employees: any[];
  isLoading: boolean;
  isLiquidating: boolean;
  selectedPeriod: any;
  currentPeriodId: string | null;
  liquidationResult: any;
}

export const MayaIntegratedComponent: React.FC<MayaIntegratedComponentProps> = ({
  employees,
  isLoading,
  isLiquidating,
  selectedPeriod,
  currentPeriodId,
  liquidationResult
}) => {
  const { setPhase } = useMaya();

  // Track payroll process phases and update MAYA context
  useEffect(() => {
    if (liquidationResult) {
      setPhase('completed', {
        employeeCount: employees.length,
        periodName: selectedPeriod?.label
      });
    } else if (isLiquidating) {
      setPhase('processing', {
        employeeCount: employees.length,
        periodName: selectedPeriod?.label,
        isProcessing: true
      });
    } else if (employees.length > 0 && selectedPeriod && currentPeriodId) {
      setPhase('liquidation_ready', {
        employeeCount: employees.length,
        periodName: selectedPeriod.label
      });
    } else if (isLoading && selectedPeriod) {
      setPhase('employee_loading', {
        periodName: selectedPeriod.label,
        isProcessing: true
      });
    } else if (selectedPeriod && !currentPeriodId) {
      setPhase('period_selection', {
        periodName: selectedPeriod.label
      });
    } else {
      setPhase('initial');
    }
  }, [employees.length, isLoading, isLiquidating, selectedPeriod, currentPeriodId, liquidationResult, setPhase]);

  // This component is invisible - it just manages MAYA's intelligence
  return null;
};