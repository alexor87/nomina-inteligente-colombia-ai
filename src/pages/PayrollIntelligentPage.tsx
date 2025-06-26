
import React from 'react';
import { PayrollLiquidation } from '@/components/payroll/PayrollLiquidation';
import { IntelligentPeriodDialog } from '@/components/payroll/IntelligentPeriodDialog';
import { usePayrollLiquidationIntelligent } from '@/hooks/usePayrollLiquidationIntelligent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const PayrollIntelligentPage = () => {
  const {
    periodStatus,
    showDialog,
    isLoading,
    isProcessing,
    handleResumePeriod,
    handleCreateNewPeriod,
    handleViewLastPeriod,
    handleGoToSettings,
    handleCloseDialog
  } = usePayrollLiquidationIntelligent();

  // Mostrar loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              Verificando estado de la nómina
            </h3>
            <p className="text-gray-600">
              Detectando períodos y configuración...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Componente principal de liquidación */}
      <PayrollLiquidation />

      {/* Diálogo inteligente para gestión de períodos */}
      {periodStatus && (
        <IntelligentPeriodDialog
          isOpen={showDialog}
          onClose={handleCloseDialog}
          periodStatus={periodStatus}
          onResumePeriod={handleResumePeriod}
          onCreateNewPeriod={handleCreateNewPeriod}
          onViewLastPeriod={handleViewLastPeriod}
          onGoToSettings={handleGoToSettings}
          isLoading={isProcessing}
        />
      )}
    </div>
  );
};

export default PayrollIntelligentPage;
