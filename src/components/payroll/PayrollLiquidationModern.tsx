
import { PayrollModernHeader } from './modern/PayrollModernHeader';
import { PayrollInlineFilters } from './modern/PayrollInlineFilters';
import { PayrollModernTable } from './modern/PayrollModernTable';
import { usePayrollLiquidationIntelligentEnhanced } from '@/hooks/usePayrollLiquidationIntelligentEnhanced';

export const PayrollLiquidationModern = () => {
  const {
    currentPeriod,
    employees,
    summary,
    isValid,
    canEdit,
    updateEmployee,
    recalculateAll,
    approvePeriod,
    refreshEmployees,
    isLoading,
    deleteEmployee
  } = usePayrollLiquidationIntelligentEnhanced();

  const handleUpdateEmployee = (id: string, updates: Partial<any>) => {
    const field = Object.keys(updates)[0];
    const value = updates[field];
    if (field && typeof value === 'number') {
      updateEmployee(id, field, value);
    }
  };

  // Loading state
  if (!currentPeriod) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparando liquidación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PayrollModernHeader
        period={currentPeriod}
        summary={summary}
      />

      <PayrollInlineFilters
        onLiquidate={recalculateAll}
        isLoading={isLoading}
      />

      <PayrollModernTable
        employees={employees}
        onUpdateEmployee={handleUpdateEmployee}
        onRecalculate={recalculateAll}
        isLoading={isLoading}
        canEdit={canEdit}
        periodoId={currentPeriod?.id || ''}
        onRefreshEmployees={refreshEmployees}
        onDeleteEmployee={deleteEmployee}
      />
    </div>
  );
};
