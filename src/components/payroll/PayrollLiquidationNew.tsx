
import React from 'react';
import { PayrollTableNew } from './PayrollTableNew';
import { PayrollSummaryPanel } from './liquidation/PayrollSummaryPanel';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePayrollLiquidationRobust } from '@/hooks/usePayrollLiquidationRobust';
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';

export const PayrollLiquidationNew = () => {
  const {
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus: robustPeriodStatus,
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    recalculateAfterNovedadChange,
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod,
    canClosePeriod,
    isValidPeriod,
    hasEmployees
  } = usePayrollLiquidationRobust();

  // Mapear RobustPeriodStatus a PeriodStatus para compatibilidad con UI existente
  const periodStatus: PeriodStatus | null = robustPeriodStatus ? {
    hasActivePeriod: robustPeriodStatus.hasActivePeriod,
    currentPeriod: robustPeriodStatus.currentPeriod,
    nextPeriod: robustPeriodStatus.nextPeriod,
    // Mapear acciones del sistema robusto a acciones esperadas por UI
    action: robustPeriodStatus.action === 'diagnose' || robustPeriodStatus.action === 'emergency' 
      ? 'suggest_next' as const
      : robustPeriodStatus.action as 'resume' | 'create',
    message: robustPeriodStatus.message,
    diagnostic: robustPeriodStatus.diagnostic
  } : null;

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
        canClosePeriod={canClosePeriod}
        isProcessing={isProcessing}
        onClosePeriod={closePeriod}
        onRecalculateAll={recalculateAll}
        selectedCount={selectedEmployees.length}
        totalCount={employees.length}
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
            onRecalculate={recalculateAfterNovedadChange}
            periodId={currentPeriod?.id || ''}
            canEdit={currentPeriod?.estado === 'borrador'}
            selectedEmployees={selectedEmployees}
            onToggleEmployee={toggleEmployeeSelection}
            onToggleAll={toggleAllEmployees}
          />
        </>
      )}
    </div>
  );
};
