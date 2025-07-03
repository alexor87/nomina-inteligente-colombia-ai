
import React, { useState } from 'react';
import { PayrollTableNew } from './PayrollTableNew';
import { PayrollSummaryPanel } from './liquidation/PayrollSummaryPanel';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollSuccessModal } from './modals/PayrollSuccessModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePayrollLiquidationRobust } from '@/hooks/usePayrollLiquidationRobust';
import { useNavigate } from 'react-router-dom';

export const PayrollLiquidationNew = () => {
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const {
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
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
  } = usePayrollLiquidationRobust();

  const handleClosePeriod = async () => {
    try {
      await closePeriod();
      
      // Show success modal with period data
      if (currentPeriod) {
        setSuccessData({
          period: currentPeriod,
          summary: summary
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error closing period:', error);
    }
  };

  const handleSuccessReturn = async () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    
    // Refresh the liquidation module to show next period creation
    await refreshPeriod();
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    
    // Navigate to history
    navigate('/app/payroll-history');
  };

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
    <>
      <div className="space-y-6">
        <PayrollPeriodHeader 
          period={currentPeriod}
          periodStatus={periodStatus}
          onCreateNewPeriod={createNewPeriod}
          onRefreshPeriod={refreshPeriod}
          canClosePeriod={canClosePeriod}
          isProcessing={isProcessing}
          onClosePeriod={handleClosePeriod}
          onRecalculateAll={recalculateAll}
          selectedCount={selectedEmployees.length}
          totalCount={employees.length}
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
              onRecalculate={recalculateAfterNovedadChange}
              periodId={currentPeriod?.id || ''}
              canEdit={currentPeriod?.estado === 'borrador'}
              selectedEmployees={selectedEmployees}
              onToggleEmployee={toggleEmployeeSelection}
              onToggleAll={toggleAllEmployees}
            />
          </>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <PayrollSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessClose}
          onReturn={handleSuccessReturn}
          periodData={{
            startDate: successData.period.fecha_inicio,
            endDate: successData.period.fecha_fin,
            type: successData.period.tipo_periodo,
            period: successData.period.periodo
          }}
          summary={successData.summary}
        />
      )}
    </>
  );
};
