import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PeriodInfo {
  hasActivePeriod: boolean;
  currentPeriod?: any;
  suggestedAction: 'continue' | 'create' | 'wait';
  message: string;
  periodData?: {
    startDate: string;
    endDate: string;
    periodName: string;
    type: 'semanal' | 'quincenal' | 'mensual';
  };
}

interface PeriodInfoPanelProps {
  periodInfo: PeriodInfo;
  employeesCount: number;
  isLoading: boolean;
  startDate: string;
  endDate: string;
  onProceed: () => void;
}

export const PeriodInfoPanel: React.FC<PeriodInfoPanelProps> = ({
  periodInfo,
  employeesCount,
  isLoading,
  startDate,
  endDate,
  onProceed
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
    return 'border-yellow-200 bg-yellow-50';
  };

  const getStatusIcon = () => {
    if (isNewPeriod) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (isExistingPeriod) return <Calendar className="h-5 w-5 text-blue-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getActionButtonText = () => {
    if (isNewPeriod) return 'Inicializar Período de Liquidación';
    if (isExistingPeriod) return 'Continuar con Período Existente';
    return 'Proceder';
  };

  const getActionButtonColor = () => {
    if (isNewPeriod) return 'bg-green-600 hover:bg-green-700';
    if (isExistingPeriod) return 'bg-blue-600 hover:bg-blue-700';
    return 'bg-gray-600 hover:bg-gray-700';
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
        {/* Period Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Período</p>
              <p className="font-medium">
                {periodInfo.currentPeriod?.periodo || periodInfo.periodData?.periodName || 'Sin definir'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {getPeriodTypeLabel(
                periodInfo.currentPeriod?.tipo_periodo || 
                periodInfo.periodData?.type || 
                'mensual'
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

        {/* Status Message */}
        <Alert className={isNewPeriod ? 'border-green-200 bg-green-50' : isExistingPeriod ? 'border-blue-200 bg-blue-50' : 'border-yellow-200 bg-yellow-50'}>
          <AlertDescription className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>{periodInfo.message}</span>
          </AlertDescription>
        </Alert>

        {/* Existing Period Info */}
        {periodInfo.currentPeriod && (
          <div className="bg-white/50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm">Información del Período Existente:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Estado:</span>
                <Badge variant={periodInfo.currentPeriod.estado === 'borrador' ? 'default' : 'secondary'} className="ml-2">
                  {periodInfo.currentPeriod.estado}
                </Badge>
              </div>
              <div>
                <span className="text-gray-600">Empleados:</span>
                <span className="ml-2 font-medium">{periodInfo.currentPeriod.empleados_count || 0}</span>
              </div>
              {periodInfo.currentPeriod.total_devengado > 0 && (
                <div>
                  <span className="text-gray-600">Total Devengado:</span>
                  <span className="ml-2 font-medium">{formatCurrency(periodInfo.currentPeriod.total_devengado)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={onProceed}
            className={`${getActionButtonColor()} text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2`}
          >
            {getStatusIcon()}
            <span>{getActionButtonText()}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
