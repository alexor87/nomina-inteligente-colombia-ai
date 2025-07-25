import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export type LiquidationStep = 
  | 'validating'
  | 'calculating'
  | 'generating_vouchers' 
  | 'sending_emails'
  | 'finalizing'
  | 'completed'
  | 'error';

interface PayrollProgressIndicatorProps {
  currentStep: LiquidationStep;
  progress: number;
  totalEmployees: number;
  processedEmployees: number;
  errors?: string[];
  isVisible: boolean;
}

const steps: Record<LiquidationStep, { label: string; description: string }> = {
  validating: {
    label: 'Validando datos',
    description: 'Verificando información de empleados y novedades'
  },
  calculating: {
    label: 'Calculando nómina',
    description: 'Procesando cálculos de liquidación'
  },
  generating_vouchers: {
    label: 'Generando comprobantes',
    description: 'Creando documentos de pago'
  },
  sending_emails: {
    label: 'Enviando emails',
    description: 'Notificando a empleados'
  },
  finalizing: {
    label: 'Finalizando',
    description: 'Cerrando período y actualizando registros'
  },
  completed: {
    label: 'Completado',
    description: 'Liquidación finalizada exitosamente'
  },
  error: {
    label: 'Error',
    description: 'Se produjo un error durante el proceso'
  }
};

export const PayrollProgressIndicator: React.FC<PayrollProgressIndicatorProps> = ({
  currentStep,
  progress,
  totalEmployees,
  processedEmployees,
  errors = [],
  isVisible
}) => {
  if (!isVisible) return null;

  const getStepIcon = (step: LiquidationStep) => {
    switch (step) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getProgressColor = () => {
    if (currentStep === 'error') return 'bg-red-600';
    if (currentStep === 'completed') return 'bg-green-600';
    return 'bg-blue-600';
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStepIcon(currentStep)}
              <div>
                <h3 className="font-semibold text-blue-800">
                  {steps[currentStep].label}
                </h3>
                <p className="text-sm text-blue-600">
                  {steps[currentStep].description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-800">
                {Math.round(progress)}%
              </p>
              <p className="text-sm text-blue-600">
                {processedEmployees} / {totalEmployees} empleados
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progress} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-blue-600">
              <span>Iniciado</span>
              <span>En progreso</span>
              <span>Completado</span>
            </div>
          </div>

          {/* Steps Timeline */}
          <div className="grid grid-cols-6 gap-2 mt-4">
            {Object.entries(steps).slice(0, -2).map(([stepKey, stepData], index) => {
              const isActive = stepKey === currentStep;
              const isCompleted = Object.keys(steps).indexOf(stepKey) < Object.keys(steps).indexOf(currentStep);
              
              return (
                <div
                  key={stepKey}
                  className={`flex flex-col items-center text-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 border border-blue-300'
                      : isCompleted
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-400 text-white'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span className={`text-xs mt-1 ${
                    isActive ? 'text-blue-800 font-medium' : 'text-gray-600'
                  }`}>
                    {stepData.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-medium text-red-800 mb-2">Errores encontrados:</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Completion Message */}
          {currentStep === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium">
                ✅ Liquidación completada exitosamente
              </p>
              <p className="text-sm text-green-700 mt-1">
                Se procesaron {totalEmployees} empleados sin errores
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};