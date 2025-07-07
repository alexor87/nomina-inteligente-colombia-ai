
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

  // CORRECCIÓN CRÍTICA: Usar exactamente las fechas seleccionadas por el usuario
  const getSelectedPeriodName = () => {
    console.log('🔍 DEBUGGING - Fechas recibidas:', { startDate, endDate });
    console.log('🔍 DEBUGGING - periodInfo.periodData:', periodInfo.periodData);
    
    // USAR DIRECTAMENTE las fechas del usuario, NO las del periodData
    if (periodInfo.periodData) {
      console.log('📝 DEBUGGING - Usando periodData.periodName:', periodInfo.periodData.periodName);
      return periodInfo.periodData.periodName;
    }
    
    // Fallback: crear nombre simple con las fechas exactas del usuario
    const fallbackName = `${startDate} - ${endDate}`;
    console.log('📝 DEBUGGING - Usando fallback name:', fallbackName);
    return fallbackName;
  };

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Información del Período</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Period Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Período Seleccionado</p>
              <p className="font-medium">{getSelectedPeriodName()}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {getPeriodTypeLabel(
                periodInfo.periodData?.type || 'mensual'
              )}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Empleados Activos</p>
              <p className="font-medium">{employeesCount} empleados</p>
            </div>
          </div>
        </div>

        {/* DEBUGGING: Mostrar fechas exactas para verificación */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
          <p><strong>🔍 DEBUG - Fechas exactas seleccionadas:</strong></p>
          <p>Inicio: {startDate}</p>
          <p>Fin: {endDate}</p>
          {periodInfo.periodData && (
            <>
              <p>periodData.startDate: {periodInfo.periodData.startDate}</p>
              <p>periodData.endDate: {periodInfo.periodData.endDate}</p>
              <p>periodData.periodName: {periodInfo.periodData.periodName}</p>
            </>
          )}
        </div>

        {/* Status Message */}
        <Alert className={isNewPeriod ? 'border-green-200 bg-green-50' : isExistingPeriod ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}>
          <AlertDescription className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>{periodInfo.message}</span>
          </AlertDescription>
        </Alert>

        {/* Existing Period Info */}
        {periodInfo.activePeriod && (
          <div className="bg-white/50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm">Información del Período Existente:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Estado:</span>
                <Badge variant={periodInfo.activePeriod.estado === 'borrador' ? 'default' : 'secondary'} className="ml-2">
                  {periodInfo.activePeriod.estado}
                </Badge>
              </div>
              <div>
                <span className="text-gray-600">Empleados:</span>
                <span className="ml-2 font-medium">{periodInfo.activePeriod.empleados_count || 0}</span>
              </div>
              {periodInfo.activePeriod.total_devengado > 0 && (
                <div>
                  <span className="text-gray-600">Total Devengado:</span>
                  <span className="ml-2 font-medium">{formatCurrency(periodInfo.activePeriod.total_devengado)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conflict Period Info */}
        {isConflict && periodInfo.conflictPeriod && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm text-orange-800">Período en Conflicto:</h4>
            <div className="text-sm">
              <p><strong>Período existente:</strong> {periodInfo.conflictPeriod.periodo}</p>
              <p><strong>Fechas:</strong> {periodInfo.conflictPeriod.fecha_inicio} - {periodInfo.conflictPeriod.fecha_fin}</p>
              <p><strong>Estado:</strong> 
                <Badge variant="secondary" className="ml-2">
                  {periodInfo.conflictPeriod.estado}
                </Badge>
              </p>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onResolveConflict?.('selected')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Continuar con período seleccionado ({startDate} - {endDate})
              </button>
              <button
                onClick={() => onResolveConflict?.('existing')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Abrir período existente ({periodInfo.conflictPeriod.fecha_inicio} - {periodInfo.conflictPeriod.fecha_fin})
              </button>
            </div>
          </div>
        )}

        {/* Action Button for non-conflict scenarios */}
        {!isConflict && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onProceed}
              className={`${
                isNewPeriod 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2`}
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
