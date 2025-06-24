
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
    <div className="min-h-screen bg-white">
      {/* Clean header with minimal styling */}
      <div className="border-b border-gray-100">
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
      </div>

      {/* Summary cards with cleaner spacing */}
      <div className="px-6 py-4">
        <PayrollSummaryCards summary={summary} />
      </div>

      {/* Main content area */}
      <div className="px-6 pb-6">
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
