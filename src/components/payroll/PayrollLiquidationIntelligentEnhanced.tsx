
import { PayrollLiquidationHeader } from './PayrollLiquidationHeader';
import { PayrollPeriodCard } from './PayrollPeriodCard';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollTable } from './liquidation/PayrollTable';
import { usePayrollLiquidationIntelligentEnhanced } from '@/hooks/usePayrollLiquidationIntelligentEnhanced';

export const PayrollLiquidationIntelligentEnhanced = () => {
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
    isLoading,
    deleteEmployee,
    deleteMultipleEmployees
  } = usePayrollLiquidationIntelligentEnhanced();

  const validEmployeeCount = employees.filter(emp => emp.status === 'valid').length;

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
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <PayrollLiquidationHeader 
          onRefresh={refreshEmployees}
          isLoading={isLoading}
        />

        {/* Period Card */}
        <PayrollPeriodCard
          period={currentPeriod}
          isValid={isValid}
          canEdit={canEdit}
          onApprove={approvePeriod}
          onUpdatePeriod={updatePeriod}
          employeeCount={employees.length}
          validEmployeeCount={validEmployeeCount}
          totalPayroll={summary.totalNetPay}
        />

        {/* Summary Cards */}
        <PayrollSummaryCards summary={summary} />

        {/* Main Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <PayrollTable
            employees={employees}
            onUpdateEmployee={handleUpdateEmployee}
            onRecalculate={recalculateAll}
            isLoading={isLoading}
            canEdit={canEdit}
            periodoId={currentPeriod?.id || ''}
            onRefreshEmployees={refreshEmployees}
            onDeleteEmployee={deleteEmployee}
            onDeleteMultipleEmployees={deleteMultipleEmployees}
          />
        </div>
      </div>
    </div>
  );
};
