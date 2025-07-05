
import React from 'react';
import { PayrollTableNew } from './PayrollTableNew';
import { PayrollSummaryPanel } from './liquidation/PayrollSummaryPanel';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollMainActions } from './liquidation/PayrollMainActions';
import { TransactionalClosureIndicator } from './closure/TransactionalClosureIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePayrollLiquidationUnified } from '@/hooks/usePayrollLiquidationUnified';
import { useSystemInitialization } from '@/hooks/useSystemInitialization';

/**
 * ✅ COMPONENTE PRINCIPAL REPARADO - FASE 2 CRÍTICA
 * Usa servicios reales sin simulaciones + inicialización automática
 */
export const PayrollLiquidationNew = () => {
  // ✅ Inicialización del sistema con limpieza automática
  const { isInitializing } = useSystemInitialization();
  
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
    liquidatePayroll, // ✅ NUEVA FUNCIÓN PRINCIPAL
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

  // Mostrar loading durante inicialización o carga normal
  if (isInitializing || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              {isInitializing ? '🔧 Optimizando sistema...' : '📊 Cargando nómina...'}
            </h3>
            <p className="text-gray-600">
              {isInitializing ? 'Preparando datos reales' : 'Conectando con base de datos'}
            </p>
          </div>
        </div>
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

  // Calcular si se puede liquidar
  const canLiquidate = selectedEmployees.length > 0 && 
                      employees.some(emp => emp.status === 'valid' && selectedEmployees.includes(emp.id)) &&
                      currentPeriod?.estado === 'borrador';

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

      {/* ✅ Indicador de Cierre Transaccional */}
      <TransactionalClosureIndicator
        isProcessing={isProcessing}
        currentStep={closureStep}
        transactionId={transactionId}
        rollbackExecuted={rollbackExecuted}
        postClosureResult={postClosureResult}
      />

      {hasEmployees && (
        <>
          {/* ✅ ACCIONES PRINCIPALES - INCLUYE BOTÓN "LIQUIDAR NÓMINA" */}
          <PayrollMainActions
            selectedCount={selectedEmployees.length}
            totalCount={employees.length}
            canLiquidate={canLiquidate}
            isProcessing={isProcessing}
            onLiquidate={liquidatePayroll}
            onRecalculate={recalculateAll}
          />

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
