
import React from 'react';
import { PayrollLiquidationIntelligentEnhanced } from '@/components/payroll/PayrollLiquidationIntelligentEnhanced';
import { IntelligentStatusBar } from '@/components/payroll/IntelligentStatusBar';
import { usePayrollIntelligentSilent } from '@/hooks/usePayrollIntelligentSilent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const PayrollIntelligentSilentPage = () => {
  const {
    isProcessing,
    periodStatus,
    errorMessage,
    retryFlow
  } = usePayrollIntelligentSilent();

  // Mostrar loading inicial solo si está procesando y no hay estado
  if (isProcessing && !periodStatus && !errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              🎯 Configurando período inteligente
            </h3>
            <p className="text-gray-600">
              Analizando automáticamente la configuración y detectando el mejor período...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de estado inteligente */}
      <div className="pt-4">
        <IntelligentStatusBar
          periodStatus={periodStatus}
          isProcessing={isProcessing}
          errorMessage={errorMessage}
          onRetry={retryFlow}
        />
      </div>

      {/* Componente principal de liquidación */}
      {periodStatus && (periodStatus.action === 'resume' || periodStatus.currentPeriod) && (
        <PayrollLiquidationIntelligentEnhanced />
      )}

      {/* Estados de error o configuración */}
      {errorMessage && !isProcessing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-lg font-medium text-gray-900">
              Configuración requerida
            </h3>
            <p className="text-gray-600">
              {errorMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollIntelligentSilentPage;
