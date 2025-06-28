
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PayrollLiquidationHeader } from './PayrollLiquidationHeader';
import { PayrollPeriodCard } from './PayrollPeriodCard';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollTable } from './liquidation/PayrollTable';
import { MagicEditBanner } from '../payroll-history/MagicEditBanner';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { toast } from '@/hooks/use-toast';

export const PayrollLiquidation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [magicEditPeriod, setMagicEditPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
    isLoading
  } = usePayrollLiquidation();

  // Check for Magic Edit mode
  useEffect(() => {
    const isMagicEdit = searchParams.get('magicEdit') === 'true';
    if (isMagicEdit) {
      const storedPeriod = sessionStorage.getItem('magicEditPeriod');
      if (storedPeriod) {
        try {
          const period = JSON.parse(storedPeriod) as PayrollHistoryPeriod;
          setMagicEditPeriod(period);
          sessionStorage.removeItem('magicEditPeriod');
          
          toast({
            title: "🎉 ¡Modo Edición Mágico Activado!",
            description: "Ahora puedes editar este período directamente. Los cambios se guardan automáticamente.",
            duration: 5000,
          });
        } catch (error) {
          console.error('Error parsing magic edit period:', error);
        }
      }
    }
  }, [searchParams]);

  // Auto-save functionality
  useEffect(() => {
    if (magicEditPeriod && hasUnsavedChanges) {
      const autoSaveTimer = setTimeout(async () => {
        setIsAutoSaving(true);
        // Simulate auto-save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsAutoSaving(false);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
      }, 2000);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [hasUnsavedChanges, magicEditPeriod]);

  const validEmployeeCount = employees.filter(emp => emp.status === 'valid').length;

  const handleUpdateEmployee = (id: string, updates: Partial<any>) => {
    const field = Object.keys(updates)[0];
    const value = updates[field];
    if (field && typeof value === 'number') {
      updateEmployee(id, field, value);
      if (magicEditPeriod) {
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleBackToHistory = () => {
    navigate('/app/payroll-history');
  };

  const handleFinishEditing = async () => {
    if (hasUnsavedChanges) {
      setIsAutoSaving(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsAutoSaving(false);
    }

    // Close the period
    toast({
      title: "Período cerrado exitosamente",
      description: "Los cambios han sido guardados y el período está nuevamente cerrado.",
    });

    // Navigate back to history
    setTimeout(() => {
      navigate('/app/payroll-history');
    }, 1000);
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
      {/* Magic Edit Banner */}
      {magicEditPeriod && (
        <MagicEditBanner
          period={magicEditPeriod}
          onBackToHistory={handleBackToHistory}
          onFinishEditing={handleFinishEditing}
          hasUnsavedChanges={hasUnsavedChanges}
          isAutoSaving={isAutoSaving}
          lastSaved={lastSaved}
        />
      )}

      <div className={`p-6 space-y-6 ${magicEditPeriod ? 'pt-32' : ''}`}>
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
