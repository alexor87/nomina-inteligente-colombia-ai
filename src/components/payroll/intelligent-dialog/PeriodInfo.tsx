
import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, AlertCircle } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
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
    if (periodStatus.action === 'create_new' && periodStatus.nextPeriod) {
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

  return (
    <div className="space-y-5">
      {/* Descripción principal */}
      <DialogDescription className="text-center text-base leading-relaxed text-gray-600">
        {periodStatus.message}
      </DialogDescription>

      {/* Información del siguiente período */}
      {periodStatus.nextPeriod && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-white rounded-md shadow-sm">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Próximo período</span>
            
            {systemMetrics.active_employees > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <Users className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">{systemMetrics.active_employees} empleados</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tipo
              </span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {periodStatus.nextPeriod.type}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fechas
              </span>
              <span className="text-sm font-medium text-gray-900">
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
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(systemMetrics.estimated_processing_time_ms / 1000)} segundos
                </span>
              </div>
            )}
          </div>

          {/* Botón de validaciones */}
          {periodStatus.action === 'create_new' && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={runValidations}
                disabled={isValidating}
                className="w-full text-xs"
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

      {/* Resumen de estado */}
      {showValidations && validations.length > 0 && (
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Estado de validaciones:</span>
            <div className="flex items-center gap-2">
              {hasErrors && (
                <span className="text-red-600 font-medium">
                  {validations.filter(v => v.type === 'error').length} errores
                </span>
              )}
              {hasWarnings && (
                <span className="text-yellow-600 font-medium">
                  {validations.filter(v => v.type === 'warning').length} advertencias
                </span>
              )}
              {!hasErrors && !hasWarnings && (
                <span className="text-green-600 font-medium">Todo listo</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
