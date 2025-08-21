
import React from 'react';
import { LiquidationStep } from '@/types/payroll';

interface PayrollProgressIndicatorProps {
  currentStep: LiquidationStep;
  progress: number;
  totalEmployees: number;
  processedEmployees: number;
  errors: string[];
  isVisible: boolean;
}

export const PayrollProgressIndicator: React.FC<PayrollProgressIndicatorProps> = ({
  currentStep,
  progress,
  totalEmployees,
  processedEmployees,
  errors,
  isVisible
}) => {
  if (!isVisible) return null;

  const getStepLabel = (step: LiquidationStep) => {
    switch (step) {
      case 'idle': return 'En espera';
      case 'initializing': return 'Inicializando';
      case 'loading_employees': return 'Cargando empleados';
      case 'validating_period': return 'Validando período';
      case 'calculating_payroll': return 'Calculando nómina';
      case 'processing_payments': return 'Procesando pagos';
      case 'generating_reports': return 'Generando reportes';
      case 'finalizing': return 'Finalizando';
      case 'completed': return 'Completado';
      case 'error': return 'Error';
      default: return 'Procesando';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {getStepLabel(currentStep)}
        </span>
        <span className="text-sm text-gray-500">
          {processedEmployees}/{totalEmployees} empleados
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {errors.length > 0 && (
        <div className="mt-2">
          <div className="text-sm text-red-600 font-medium">Errores encontrados:</div>
          {errors.map((error, index) => (
            <div key={index} className="text-xs text-red-500 mt-1">
              • {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
