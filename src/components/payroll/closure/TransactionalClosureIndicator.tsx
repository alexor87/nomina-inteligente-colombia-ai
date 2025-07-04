
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Shield, Database, RefreshCw, Calendar, ArrowRight } from 'lucide-react';

interface TransactionalClosureIndicatorProps {
  isProcessing: boolean;
  currentStep: 'validation' | 'snapshot' | 'closure' | 'verification' | 'completed' | 'error';
  transactionId?: string;
  rollbackExecuted?: boolean;
  message?: string;
  postClosureResult?: any;
}

export const TransactionalClosureIndicator: React.FC<TransactionalClosureIndicatorProps> = ({
  isProcessing,
  currentStep,
  transactionId,
  rollbackExecuted,
  message,
  postClosureResult
}) => {
  const getStepIcon = (step: string, isActive: boolean, isCompleted: boolean) => {
    const baseClass = "h-4 w-4";
    const activeClass = isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400";
    
    switch (step) {
      case 'validation':
        return <Shield className={`${baseClass} ${activeClass}`} />;
      case 'snapshot':
        return <Database className={`${baseClass} ${activeClass}`} />;
      case 'closure':
        return <CheckCircle className={`${baseClass} ${activeClass}`} />;
      case 'verification':
        return <AlertCircle className={`${baseClass} ${activeClass}`} />;
      default:
        return <Clock className={`${baseClass} ${activeClass}`} />;
    }
  };

  const getStepStatus = (step: string) => {
    const steps = ['validation', 'snapshot', 'closure', 'verification'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (currentStep === 'error') {
      return stepIndex < currentIndex ? 'completed' : 'error';
    }
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (!isProcessing && currentStep !== 'completed' && currentStep !== 'error') {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {isProcessing && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
                <h3 className="font-semibold text-gray-900">
                  {currentStep === 'completed' ? 'Cierre Completado' : 
                   currentStep === 'error' ? 'Error en Cierre' : 
                   'Cierre Transaccional en Progreso'}
                </h3>
              </div>
              {transactionId && (
                <Badge variant="outline" className="text-xs font-mono">
                  {transactionId.slice(-8)}
                </Badge>
              )}
            </div>
            
            {rollbackExecuted && (
              <Badge className="bg-orange-100 text-orange-800">
                Rollback Ejecutado
              </Badge>
            )}
          </div>

          {/* Progress Steps */}
          <div className="space-y-3">
            {[
              { key: 'validation', label: 'Validaciones Pre-cierre', description: 'Verificando integridad de datos' },
              { key: 'snapshot', label: 'Snapshot de Respaldo', description: 'Creando punto de restauración' },
              { key: 'closure', label: 'Cierre Atómico', description: 'Ejecutando operaciones transaccionales' },
              { key: 'verification', label: 'Verificación Post-cierre', description: 'Confirmando resultado y detectando siguiente período' }
            ].map((step) => {
              const status = getStepStatus(step.key);
              const isActive = status === 'active';
              const isCompleted = status === 'completed';
              const hasError = status === 'error';
              
              return (
                <div key={step.key} className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`}>
                    {getStepIcon(step.key, isActive, isCompleted)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${
                      isCompleted ? 'text-green-700' : 
                      isActive ? 'text-blue-700' : 
                      hasError ? 'text-red-700' : 
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </div>
                    <div className={`text-xs ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {hasError && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ✅ FASE 3: Información Post-Cierre */}
          {currentStep === 'completed' && postClosureResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Detección Post-Cierre
                </span>
              </div>
              
              {postClosureResult.nextPeriodSuggestion ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-green-700">
                    <span>Siguiente período detectado:</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {postClosureResult.nextPeriodSuggestion.startDate}
                    </Badge>
                    <span className="text-xs text-green-600">→</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {postClosureResult.nextPeriodSuggestion.endDate}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {postClosureResult.nextPeriodSuggestion.type}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-green-700">
                  {postClosureResult.message || 'Verificación completada exitosamente'}
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`text-sm p-3 rounded-md ${
              currentStep === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              currentStep === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {message}
            </div>
          )}

          {/* Technical Details */}
          {(currentStep === 'error' || currentStep === 'completed') && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>• Operaciones atómicas garantizadas</div>
              <div>• Rollback automático en caso de error</div>
              <div>• Sincronización BD ↔ Historial automática</div>
              {currentStep === 'completed' && (
                <div>• Detección inteligente del siguiente período</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
