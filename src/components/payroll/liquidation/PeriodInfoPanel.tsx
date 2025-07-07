import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Users, AlertTriangle, CheckCircle, Clock, Hash } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PeriodNumberCalculationService } from '@/services/payroll-intelligent/PeriodNumberCalculationService';

interface PeriodInfo {
  hasActivePeriod: boolean;
  activePeriod?: any;
  suggestedAction: 'continue' | 'create' | 'conflict';
  message: string;
  periodData?: {
    startDate: string;
    endDate: string;
    periodName: string;
    type: 'semanal' | 'quincenal' | 'mensual';
  };
  conflictPeriod?: any;
}

interface PeriodInfoPanelProps {
  periodInfo: PeriodInfo;
  employeesCount: number;
  isLoading: boolean;
  startDate: string;
  endDate: string;
  onProceed: () => void;
  onResolveConflict?: (action: 'selected' | 'existing') => void;
}

export const PeriodInfoPanel: React.FC<PeriodInfoPanelProps> = ({
  periodInfo,
  employeesCount,
  isLoading,
  startDate,
  endDate,
  onProceed,
  onResolveConflict
}) => {
  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-blue-700">Analizando período seleccionado...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isNewPeriod = periodInfo.suggestedAction === 'create';
  const isExistingPeriod = periodInfo.suggestedAction === 'continue';
  const isConflict = periodInfo.suggestedAction === 'conflict';
  
  const getPeriodTypeLabel = (type: string) => {
    const labels = {
      'quincenal': 'Quincenal',
      'mensual': 'Mensual',
      'semanal': 'Semanal'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = () => {
    if (isNewPeriod) return 'border-green-200 bg-green-50';
    if (isExistingPeriod) return 'border-blue-200 bg-blue-50';
    if (isConflict) return 'border-orange-200 bg-orange-50';
    return 'border-gray-200 bg-gray-50';
  };

  const getStatusIcon = () => {
    if (isNewPeriod) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (isExistingPeriod) return <Calendar className="h-5 w-5 text-blue-600" />;
    if (isConflict) return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    return <Clock className="h-5 w-5 text-gray-600" />;
  };

  const getSelectedPeriodName = () => {
    // CORRECCIÓN: Priorizar el nombre generado correctamente por el servicio
    if (periodInfo.periodData?.periodName) {
      console.log('🏷️ USANDO NOMBRE DEL SERVICIO:', periodInfo.periodData.periodName);
      return periodInfo.periodData.periodName;
    }
    
    // Fallback: crear nombre simple con las fechas exactas del usuario
    const fallbackName = `${startDate} - ${endDate}`;
    console.log('🏷️ USANDO NOMBRE FALLBACK:', fallbackName);
    return fallbackName;
  };

  const getPeriodNumberInfo = () => {
    if (periodInfo.activePeriod?.numero_periodo_anual) {
      // ✅ CORRECCIÓN: Parsing manual para evitar problemas de timezone
      const startParts = periodInfo.activePeriod.fecha_inicio.split('-');
      const year = parseInt(startParts[0]); // Usar año de la fecha de inicio, no new Date()
      
      console.log('🔢 GENERANDO NOMBRE SEMÁNTICO PARA PERÍODO EXISTENTE:', {
        numero: periodInfo.activePeriod.numero_periodo_anual,
        tipo: periodInfo.activePeriod.tipo_periodo,
        year,
        fechaInicio: periodInfo.activePeriod.fecha_inicio
      });
      
      const semanticName = PeriodNumberCalculationService.getSemanticPeriodName(
        periodInfo.activePeriod.numero_periodo_anual,
        periodInfo.activePeriod.tipo_periodo,
        year,
        periodInfo.activePeriod.periodo
      );
      
      console.log('✨ NOMBRE SEMÁNTICO GENERADO:', semanticName);
      
      return {
        hasNumber: true,
        number: periodInfo.activePeriod.numero_periodo_anual,
        semanticName
      };
    }
    
    return { hasNumber: false };
  };

  // CORRECCIÓN: Solo usar getPeriodNumberInfo para períodos EXISTENTES con número
  // Para períodos nuevos, usar siempre el nombre del servicio
  const shouldUseSemanticName = isExistingPeriod && periodInfo.activePeriod?.numero_periodo_anual;
  const periodNumberInfo = shouldUseSemanticName ? getPeriodNumberInfo() : { hasNumber: false };

  console.log('🔍 DEBUG PERIOD DISPLAY:', {
    isNewPeriod,
    isExistingPeriod,
    shouldUseSemanticName,
    hasNumber: periodNumberInfo.hasNumber,
    periodDataName: periodInfo.periodData?.periodName,
    semanticName: periodNumberInfo.semanticName,
    finalDisplayName: shouldUseSemanticName && periodNumberInfo.hasNumber 
      ? periodNumberInfo.semanticName 
      : getSelectedPeriodName()
  });

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Información del Período</span>
          {periodNumberInfo.hasNumber && (
            <Badge variant="outline" className="ml-2 font-mono">
              <Hash className="h-3 w-3 mr-1" />
              #{periodNumberInfo.number}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Period Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600 font-medium">Período Seleccionado</p>
              <p className="font-semibold text-gray-900">
                {shouldUseSemanticName && periodNumberInfo.hasNumber 
                  ? periodNumberInfo.semanticName 
                  : getSelectedPeriodName()
                }
              </p>
              {periodNumberInfo.hasNumber && (
                <p className="text-xs text-gray-500">
                  Número ordinal: {periodNumberInfo.number}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Badge variant="outline" className="font-medium">
                {getPeriodTypeLabel(
                  periodInfo.periodData?.type || 'mensual'
                )}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600 font-medium">Empleados Activos</p>
              <p className="font-semibold text-gray-900">{employeesCount} empleados</p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <Alert className={isNewPeriod ? 'border-green-200 bg-green-50' : isExistingPeriod ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}>
          <AlertDescription className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="font-medium">{periodInfo.message}</span>
          </AlertDescription>
        </Alert>

        {/* Existing Period Info */}
        {periodInfo.activePeriod && (
          <div className="bg-white/70 rounded-lg p-4 border border-gray-200 space-y-3">
            <h4 className="font-semibold text-gray-800 text-sm">Información del Período Existente:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Estado:</span>
                <Badge variant={periodInfo.activePeriod.estado === 'borrador' ? 'default' : 'secondary'}>
                  {periodInfo.activePeriod.estado}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Empleados:</span>
                <span className="font-semibold">{periodInfo.activePeriod.empleados_count || 0}</span>
              </div>
              {periodInfo.activePeriod.numero_periodo_anual && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Número del año:</span>
                  <Badge variant="outline" className="font-mono">
                    #{periodInfo.activePeriod.numero_periodo_anual}
                  </Badge>
                </div>
              )}
              {periodInfo.activePeriod.total_devengado > 0 && (
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-gray-600">Total Devengado:</span>
                  <span className="font-semibold text-green-700">{formatCurrency(periodInfo.activePeriod.total_devengado)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conflict Period Info */}
        {isConflict && periodInfo.conflictPeriod && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-orange-800 text-sm">Período en Conflicto:</h4>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <strong>Período existente:</strong>
                <span>{periodInfo.conflictPeriod.periodo}</span>
              </div>
              <div className="flex justify-between">
                <strong>Fechas:</strong>
                <span>{periodInfo.conflictPeriod.fecha_inicio} - {periodInfo.conflictPeriod.fecha_fin}</span>
              </div>
              <div className="flex justify-between items-center">
                <strong>Estado:</strong>
                <Badge variant="secondary">
                  {periodInfo.conflictPeriod.estado}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-3 pt-3 border-t border-orange-200">
              <button
                onClick={() => onResolveConflict?.('selected')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Continuar con período seleccionado ({startDate} - {endDate})
              </button>
              <button
                onClick={() => onResolveConflict?.('existing')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Abrir período existente ({periodInfo.conflictPeriod.fecha_inicio} - {periodInfo.conflictPeriod.fecha_fin})
              </button>
            </div>
          </div>
        )}

        {/* Action Button for non-conflict scenarios */}
        {!isConflict && (
          <div className="flex justify-center pt-4">
            <button
              onClick={onProceed}
              className={`${
                isNewPeriod 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 shadow-sm hover:shadow-md`}
            >
              {getStatusIcon()}
              <span>
                {isNewPeriod 
                  ? 'Inicializar Período de Liquidación' 
                  : 'Continuar con Período Existente'
                }
              </span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
