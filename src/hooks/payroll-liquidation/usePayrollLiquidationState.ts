
import { useState } from 'react';
import { PayrollLiquidationState, ClosureStep } from '@/types/payroll-liquidation';
import { PayrollEmployee, PayrollSummary, PeriodStatus } from '@/types/payroll';

/**
 * ✅ HOOK DE ESTADO PARA LIQUIDACIÓN - CORRECCIÓN FASE 1
 * Maneja únicamente el estado de la UI sin lógica de negocio
 */
export const usePayrollLiquidationState = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);
  const [closureStep, setClosureStep] = useState<ClosureStep>('validation');
  const [transactionId, setTransactionId] = useState<string | undefined>();
  const [rollbackExecuted, setRollbackExecuted] = useState(false);
  const [postClosureResult, setPostClosureResult] = useState<any>(null);

  const state: PayrollLiquidationState = {
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    closureStep,
    transactionId,
    rollbackExecuted,
    postClosureResult
  };

  const actions = {
    setIsLoading,
    setIsProcessing,
    setCurrentPeriod,
    setEmployees,
    setSelectedEmployees,
    setSummary,
    setPeriodStatus,
    setClosureStep,
    setTransactionId,
    setRollbackExecuted,
    setPostClosureResult
  };

  return { state, actions };
};
