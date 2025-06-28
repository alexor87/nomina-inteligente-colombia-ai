
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PayrollLiquidationHeader } from './PayrollLiquidationHeader';
import { PayrollPeriodCard } from './PayrollPeriodCard';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollTable } from './liquidation/PayrollTable';
import { SimpleReopenedBanner } from './SimpleReopenedBanner';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { toast } from '@/hooks/use-toast';

export const PayrollLiquidation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    currentPeriod,
    employees,
    summary,
    isValid,
    canEdit,
    isEditingPeriod,
    setIsEditingPeriod,
    isReopenedPeriod,
    reopenedBy,
    reopenedAt,
    updateEmployee,
    updatePeriod,
    recalculateAll,
    approvePeriod,
    finishReopenedPeriodEditing,
    refreshEmployees,
    isLoading
  } = usePayrollLiquidation();

  const validEmployeeCount = employees.filter(emp => emp.status === 'valid').length;

  const handleUpdateEmployee = (id: string, updates: Partial<any>) => {
    const field = Object.keys(updates)[0];
    const value = updates[field];
    if (field && typeof value === 'number') {
      updateEmployee(id, field, value);
    }
  };

  const handleBackToHistory = () => {
    navigate('/app/payroll-history');
  };

  const handleFinishEditing = async () => {
    if (isReopenedPeriod) {
      await finishReopenedPeriodEditing();
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

  const formatPeriodName = () => {
    if (!currentPeriod) return '';
    const startDate = new Date(currentPeriod.fecha_inicio);
    const endDate = new Date(currentPeriod.fecha_fin);
    return `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Reopened Period Banner */}
      {isReopenedPeriod && (
        <SimpleReopenedBanner
          periodName={formatPeriodName()}
          onBackToHistory={handleBackToHistory}
          onFinishEditing={handleFinishEditing}
          isLoading={isLoading}
        />
      )}

      <div className={`p-6 space-y-6 ${isReopenedPeriod ? 'pt-6' : ''}`}>
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
          />
        </div>
      </div>
    </div>
  );
};
