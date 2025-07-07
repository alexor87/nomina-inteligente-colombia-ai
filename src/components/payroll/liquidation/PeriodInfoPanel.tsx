import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Users, AlertTriangle, CheckCircle, Clock, Hash, Info, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PeriodDetectionResult } from '@/services/payroll/PeriodService';

interface PeriodInfoPanelProps {
  periodInfo: PeriodDetectionResult;
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
  const isInvalid = periodInfo.suggestedAction === 'invalid';
  const isIncoherentPeriod = periodInfo.message.includes('no corresponden exactamente');

  const getStatusColor = () => {
    if (isInvalid) return 'border-red-200 bg-red-50';
    if (isNewPeriod && !isIncoherentPeriod) return 'border-green-200 bg-green-50';
    if (isNewPeriod && isIncoherentPeriod) return 'border-yellow-200 bg-yellow-50';
    if (isExistingPeriod) return 'border-blue-200 bg-blue-50';
    if (isConflict) return 'border-orange-200 bg-orange-50';
    return 'border-gray-200 bg-gray-50';
  };

  const getStatusIcon = () => {
    if (isInvalid) return <XCircle className="h-5 w-5 text-red-600" />;
    if (isNewPeriod && !isIncoherentPeriod) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (isNewPeriod && isIncoherentPeriod) return <Info className="h-5 w-5 text-yellow-600" />;
    if (isExistingPeriod) return <Calendar className="h-5 w-5 text-blue-600" />;
    if (isConflict) return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    return <Clock className="h-5 w-5 text-gray-600" />;
  };

  const displayName = periodInfo.periodData.semanticName || periodInfo.periodData.name;

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Información del Período</span>
          {periodInfo.periodData.number && !isInvalid && (
            <Badge variant="outline" className="ml-2 font-mono">
              <Hash className="h-3 w-3 mr-1" />
              #{periodInfo.periodData.number}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invalid Range Alert */}
        {isInvalid && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="font-medium text-red-800">
              <div className="space-y-2">
                <p>{periodInfo.periodData.validationError}</p>
                <div className="text-sm text-red-700">
                  <p><strong>Rangos válidos para nómina:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Semanal: máximo 10 días (ej: 1-7 enero)</li>
                    <li>Quincenal: máximo 20 días (ej: 1-15 enero)</li>
                    <li>Mensual: máximo 35 días (ej: 1-31 enero)</li>
                  </ul>
                  <p className="mt-2 font-medium">Por favor, selecciona un rango de fechas más corto.</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Selected Period Details - Only show if not invalid */}
        {!isInvalid && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Período Seleccionado</p>
                <p className="font-semibold text-gray-900">{displayName}</p>
                {periodInfo.periodData.number && (
                  <p className="text-xs text-gray-500">
                    Número ordinal: {periodInfo.periodData.number}
                  </p>
                )}
                <p className="text-xs text-blue-500 mt-1">
                  Fechas: {startDate} - {endDate}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Badge variant="outline" className="font-medium">
                  {periodInfo.periodData.type === 'quincenal' ? 'Quincenal' : 
                   periodInfo.periodData.type === 'mensual' ? 'Mensual' : 'Semanal'}
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
        )}

        {/* Status Message - Only show if not invalid */}
        {!isInvalid && (
          <Alert className={
            isNewPeriod && !isIncoherentPeriod ? 'border-green-200 bg-green-50' : 
            isNewPeriod && isIncoherentPeriod ? 'border-yellow-200 bg-yellow-50' :
            isExistingPeriod ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'
          }>
            <AlertDescription className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="font-medium">{periodInfo.message}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Coherence Warning for Incoherent Periods */}
        {isIncoherentPeriod && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-yellow-800 text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Advertencia de Coherencia
            </h4>
            <p className="text-sm text-yellow-700">
              Las fechas seleccionadas no corresponden exactamente a un período {periodInfo.periodData.type} estándar. 
              Un período {periodInfo.periodData.type} típico sería:
            </p>
            <div className="text-xs text-yellow-600 font-mono bg-yellow-100 p-2 rounded">
              {periodInfo.periodData.type === 'semanal' && '• Semana 1: 1-7 de enero, Semana 2: 8-14 de enero, etc.'}
              {periodInfo.periodData.type === 'quincenal' && '• Quincena 1: 1-15 del mes, Quincena 2: 16-último día del mes'}
              {periodInfo.periodData.type === 'mensual' && '• Mes: 1 de enero - 31 de enero, 1 de febrero - 28/29 de febrero, etc.'}
            </div>
          </div>
        )}

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

        {/* Action Button for non-conflict and non-invalid scenarios */}
        {!isConflict && !isInvalid && (
          <div className="flex justify-center pt-4">
            <button
              onClick={onProceed}
              className={`${
                isNewPeriod && !isIncoherentPeriod
                  ? 'bg-green-600 hover:bg-green-700' 
                  : isNewPeriod && isIncoherentPeriod
                  ? 'bg-yellow-600 hover:bg-yellow-700'
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
