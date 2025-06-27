
import { PayrollModernHeader } from './modern/PayrollModernHeader';
import { PayrollModernSummary } from './modern/PayrollModernSummary';
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
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              🎯 Preparando liquidación inteligente
            </h3>
            <p className="text-gray-600">
              Configurando el período y cargando empleados...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <PayrollModernHeader
        period={currentPeriod}
        isValid={isValid}
        canEdit={canEdit}
        onApprove={approvePeriod}
        onRefresh={refreshEmployees}
        isLoading={isLoading}
      />

      {/* Summary Cards */}
      <PayrollModernSummary summary={summary} />

      {/* Main Table */}
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
