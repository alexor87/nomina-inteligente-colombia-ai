
import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, AlertCircle, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PeriodStatus } from '@/services/payroll-intelligent/PayrollPeriodDetectionService';
import { ValidationAlert } from './ValidationAlert';
import { PayrollValidationService, ValidationResult } from '@/services/payroll-intelligent/PayrollValidationService';
import { PayrollPerformanceService } from '@/services/payroll-intelligent/PayrollPerformanceService';

interface PeriodInfoProps {
  periodStatus: PeriodStatus;
}

export const PeriodInfo: React.FC<PeriodInfoProps> = ({
  periodStatus
}) => {
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<Record<string, any>>({});
  const [showValidations, setShowValidations] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Auto-validar cuando se propone crear un nuevo período
    if (periodStatus.action === 'create' && periodStatus.nextPeriod) {
      runValidations();
      loadSystemMetrics();
    }
  }, [periodStatus]);

  const runValidations = async () => {
    if (!periodStatus.nextPeriod) return;
    
    setIsValidating(true);
    try {
      const results = await PayrollValidationService.validatePeriodCreation(
        periodStatus.nextPeriod.startDate,
        periodStatus.nextPeriod.endDate,
        periodStatus.nextPeriod.type
      );
      setValidations(results);
      setShowValidations(true);
    } catch (error) {
      console.error('Error en validaciones:', error);
      setValidations([{
        type: 'error',
        message: 'Error ejecutando validaciones',
        details: 'Intenta nuevamente o contacta al administrador'
      }]);
    } finally {
      setIsValidating(false);
    }
  };

  const loadSystemMetrics = async () => {
    try {
      const metrics = await PayrollPerformanceService.calculateSystemMetrics(''); // Se obtendrá internamente
      setSystemMetrics(metrics);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  };

  const hasErrors = validations.some(v => v.type === 'error');
  const hasWarnings = validations.some(v => v.type === 'warning');
  const errorCount = validations.filter(v => v.type === 'error').length;
  const warningCount = validations.filter(v => v.type === 'warning').length;
  const successCount = validations.filter(v => v.type === 'success').length;

  const getStatusIcon = () => {
    if (hasErrors) return <XCircle className="h-4 w-4 text-red-500" />;
    if (hasWarnings) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (hasErrors) return 'Errores críticos encontrados';
    if (hasWarnings) return 'Advertencias encontradas';
    return 'Validaciones exitosas';
  };

  const getStatusDescription = () => {
    const parts = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? 'es' : ''} crítico${errorCount > 1 ? 's' : ''}`);
    if (warningCount > 0) parts.push(`${warningCount} advertencia${warningCount > 1 ? 's' : ''}`);
    if (successCount > 0) parts.push(`${successCount} validación${successCount > 1 ? 'es' : ''} exitosa${successCount > 1 ? 's' : ''}`);
    
    return parts.join(', ');
  };

  return (
    <div className="space-y-4">
      {/* Descripción principal */}
      <DialogDescription className="text-center text-sm leading-relaxed text-gray-600">
        {periodStatus.message}
      </DialogDescription>

      {/* Información del siguiente período */}
      {periodStatus.nextPeriod && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 bg-white rounded-md shadow-sm">
              <Calendar className="h-3 w-3 text-gray-600" />
            </div>
            <span className="text-xs font-semibold text-gray-900">Próximo período</span>
            
            {systemMetrics.active_employees > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <Users className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">{systemMetrics.active_employees} empleados</span>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tipo
              </span>
              <span className="text-xs font-medium text-gray-900 capitalize">
                {periodStatus.nextPeriod.type}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fechas
              </span>
              <span className="text-xs font-medium text-gray-900">
                {new Date(periodStatus.nextPeriod.startDate).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short'
                })} - {new Date(periodStatus.nextPeriod.endDate).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Métricas de rendimiento */}
            {systemMetrics.estimated_processing_time_ms && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Tiempo estimado
                </span>
                <span className="text-xs font-medium text-gray-900">
                  {Math.round(systemMetrics.estimated_processing_time_ms / 1000)} segundos
                </span>
              </div>
            )}
          </div>

          {/* Botón de validaciones */}
          {periodStatus.action === 'create' && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={runValidations}
                disabled={isValidating}
                className="w-full text-xs h-7"
              >
                {isValidating ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {showValidations ? 'Actualizar validaciones' : 'Ejecutar validaciones'}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Alertas de validación */}
      <ValidationAlert validations={validations} isVisible={showValidations} />

      {/* Resumen de estado mejorado */}
      {showValidations && validations.length > 0 && (
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-start gap-2">
            {getStatusIcon()}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-900">{getStatusText()}</span>
              </div>
              
              <p className="text-xs text-gray-600 mb-2">
                {getStatusDescription()}
              </p>

              {/* Detalles específicos de errores */}
              {hasErrors && (
                <div className="bg-red-50 rounded-md p-2 mb-2">
                  <div className="text-xs font-medium text-red-800 mb-1">
                    Errores que debes corregir:
                  </div>
                  <ul className="text-xs text-red-700 space-y-1">
                    {validations.filter(v => v.type === 'error').map((error, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{error.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advertencias específicas */}
              {hasWarnings && !hasErrors && (
                <div className="bg-yellow-50 rounded-md p-2">
                  <div className="text-xs font-medium text-yellow-800 mb-1">
                    Advertencias a considerar:
                  </div>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {validations.filter(v => v.type === 'warning').map((warning, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        <span>{warning.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estado listo */}
              {!hasErrors && !hasWarnings && successCount > 0 && (
                <div className="bg-green-50 rounded-md p-2">
                  <div className="text-xs text-green-700">
                    ✅ Todas las validaciones completadas exitosamente. El período está listo para ser creado.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
