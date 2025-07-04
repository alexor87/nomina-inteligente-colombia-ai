
import React from 'react';
import { PayrollTableNew } from './PayrollTableNew';
import { PayrollSummaryPanel } from './liquidation/PayrollSummaryPanel';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { TransactionalClosureIndicator } from './closure/TransactionalClosureIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePayrollLiquidationNew } from '@/hooks/usePayrollLiquidationNew';

/**
 * ✅ COMPONENTE PRINCIPAL DE LIQUIDACIÓN - FASE 3
 * Integra cierre transaccional con detección post-cierre inteligente
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
        canClosePeriod={canClosePeriod}
        isProcessing={isProcessing}
        onClosePeriod={closePeriod}
        onRecalculateAll={recalculateAll}
        selectedCount={selectedEmployees.length}
        totalCount={employees.length}
      />

      {/* ✅ FASE 3: Indicador de Cierre Transaccional con Detección Post-Cierre */}
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
