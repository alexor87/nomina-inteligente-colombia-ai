
import { useState } from 'react';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollTable } from './liquidation/PayrollTable';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { usePayrollLiquidationBackend } from '@/hooks/usePayrollLiquidationBackend';

export const PayrollLiquidationBackend = () => {
  const {
    currentPeriod,
    employees,
    summary,
    isValid,
    canEdit,
    isEditingPeriod,
    setIsEditingPeriod,
    updateEmployee,
    updatePeriod,
    recalculateAll,
    approvePeriod,
    refreshEmployees,
    isLoading
  } = usePayrollLiquidationBackend();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <PayrollPeriodHeader 
        period={currentPeriod}
        isLoading={isLoading}
        isValid={isValid}
        canEdit={canEdit}
        isEditingPeriod={isEditingPeriod}
        setIsEditingPeriod={setIsEditingPeriod}
        onApprove={approvePeriod}
        onUpdatePeriod={updatePeriod}
      />

      <PayrollSummaryCards summary={summary} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <PayrollTable
            employees={employees}
            onUpdateEmployee={updateEmployee}
            onRecalculate={recalculateAll}
            isLoading={isLoading}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
};
