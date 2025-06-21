
import { useState } from 'react';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollTable } from './liquidation/PayrollTable';
import { PayrollSummaryPanel } from './liquidation/PayrollSummaryPanel';
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

  const [showSummary, setShowSummary] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header fijo */}
      <PayrollPeriodHeader 
        period={currentPeriod}
        isLoading={isLoading}
      />

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

        {/* Panel lateral */}
        {showSummary && (
          <PayrollSummaryPanel
            summary={summary}
            onClose={() => setShowSummary(false)}
          />
        )}
      </div>

      {/* Acciones flotantes */}
      <PayrollActions
        isValid={isValid}
        onApprove={approvePeriod}
        onRecalculate={recalculateAll}
        onToggleSummary={() => setShowSummary(!showSummary)}
        showSummary={showSummary}
      />
    </div>
  );
};
