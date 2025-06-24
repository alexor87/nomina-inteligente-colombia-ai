
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

  const validEmployeeCount = employees.filter(emp => emp.status === 'valid').length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <PayrollPeriodHeader 
        period={currentPeriod}
        isLoading={isLoading}
        isValid={isValid}
        canEdit={canEdit}
        isEditingPeriod={isEditingPeriod}
        setIsEditingPeriod={setIsEditingPeriod}
        onApprove={approvePeriod}
        onUpdatePeriod={updatePeriod}
        employeeCount={employees.length}
        validEmployeeCount={validEmployeeCount}
        totalPayroll={summary.totalNetPay}
      />

      <PayrollSummaryCards summary={summary} />

      <div className="flex-1 flex flex-col pb-6">
        <PayrollTable
          employees={employees}
          onUpdateEmployee={updateEmployee}
          onRecalculate={recalculateAll}
          isLoading={isLoading}
          canEdit={canEdit}
          periodoId={currentPeriod?.id || ''}
          onRefreshEmployees={refreshEmployees}
        />
      </div>
    </div>
  );
};
