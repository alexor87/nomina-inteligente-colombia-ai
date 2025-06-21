
import { useState } from 'react';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollTable } from './liquidation/PayrollTable';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollActions } from './liquidation/PayrollActions';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';

export const PayrollLiquidation = () => {
  const {
    currentPeriod,
    employees,
    summary,
    isValid,
    updateEmployee,
    recalculateAll,
    approvePeriod,
    isLoading
  } = usePayrollLiquidation();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header fijo */}
      <PayrollPeriodHeader 
        period={currentPeriod}
        isLoading={isLoading}
        isValid={isValid}
        onApprove={approvePeriod}
      />

      {/* Resumen en tarjetas */}
      <PayrollSummaryCards summary={summary} />

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tabla principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <PayrollTable
            employees={employees}
            onUpdateEmployee={updateEmployee}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Acciones flotantes */}
      <PayrollActions
        onRecalculate={recalculateAll}
        onToggleSummary={() => {}} // No longer needed but keeping for compatibility
        showSummary={true}
      />
    </div>
  );
};
