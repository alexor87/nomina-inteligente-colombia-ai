
import React from 'react';
import { PayrollTableNew } from './PayrollTableNew';
import { PayrollSummaryPanel } from './liquidation/PayrollSummaryPanel';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { TransactionalClosureIndicator } from './closure/TransactionalClosureIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePayrollLiquidationUnified } from '@/hooks/usePayrollLiquidationUnified';

/**
 * ✅ COMPONENTE PRINCIPAL DE LIQUIDACIÓN - CORRECCIÓN FASE 1
 * Usa el hook unificado para liquidación de nómina
 */
export const PayrollLiquidationNew = () => {
  const {
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
    postClosureResult,
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
  } = usePayrollLiquidationUnified();

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

      {/* ✅ CORRECCIÓN FASE 1: Indicador de Cierre Transaccional */}
      <TransactionalClosureIndicator
        isProcessing={isProcessing}
        currentStep={closureStep}
        transactionId={transactionId}
        rollbackExecuted={rollbackExecuted}
        postClosureResult={postClosureResult}
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
            onRecalculate={recalculateAll}
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
