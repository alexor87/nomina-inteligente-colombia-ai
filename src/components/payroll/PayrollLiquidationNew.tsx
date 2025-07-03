
import React from 'react';
import { PayrollTableNew } from './PayrollTableNew';
import { PayrollSummaryPanel } from './liquidation/PayrollSummaryPanel';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollActions } from './liquidation/PayrollActions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePayrollLiquidationNew } from '@/hooks/usePayrollLiquidationNew';

export const PayrollLiquidationNew = () => {
  const {
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    recalculateAfterNovedadChange, // ✅ Usar la función específica
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod,
    canClosePeriod,
    isValidPeriod,
    hasEmployees
  } = usePayrollLiquidationNew();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isValidPeriod) {
    return (
      <div className="space-y-6">
        <PayrollPeriodHeader 
          period={null}
          periodStatus={periodStatus}
          onCreateNewPeriod={createNewPeriod}
          onRefreshPeriod={refreshPeriod}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PayrollPeriodHeader 
        period={currentPeriod}
        periodStatus={periodStatus}
        onCreateNewPeriod={createNewPeriod}
        onRefreshPeriod={refreshPeriod}
      />

      {hasEmployees && (
        <>
          <PayrollSummaryPanel 
            summary={summary}
            selectedCount={selectedEmployees.length}
            totalCount={employees.length}
          />

          <PayrollTableNew
            employees={employees}
            onRemoveEmployee={removeEmployeeFromPeriod}
            onCreateNovedad={createNovedadForEmployee}
            onRecalculate={recalculateAfterNovedadChange} // ✅ Pasar callback específico
            periodId={currentPeriod?.id || ''}
            canEdit={currentPeriod?.estado === 'borrador'}
            selectedEmployees={selectedEmployees}
            onToggleEmployee={toggleEmployeeSelection}
            onToggleAll={toggleAllEmployees}
          />

          <PayrollActions
            canClosePeriod={canClosePeriod}
            isProcessing={isProcessing}
            onClosePeriod={closePeriod}
            onRecalculateAll={recalculateAll}
            selectedCount={selectedEmployees.length}
            totalCount={employees.length}
          />
        </>
      )}
    </div>
  );
};
