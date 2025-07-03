
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  RefreshCw, 
  Plus,
  Calculator,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';

interface PayrollPeriodHeaderProps {
  period?: any;
  periodStatus?: PeriodStatus | null;
  onCreateNewPeriod?: () => void;
  onRefreshPeriod?: () => void;
  canClosePeriod?: boolean;
  isProcessing?: boolean;
  onClosePeriod?: () => void;
  onRecalculateAll?: () => void;
  selectedCount?: number;
  totalCount?: number;
}

export const PayrollPeriodHeader: React.FC<PayrollPeriodHeaderProps> = ({
  period,
  periodStatus,
  onCreateNewPeriod,
  onRefreshPeriod,
  canClosePeriod = false,
  isProcessing = false,
  onClosePeriod,
  onRecalculateAll,
  selectedCount = 0,
  totalCount = 0
}) => {
  // Mostrar estado de creación de período
  if (!period && periodStatus) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-orange-600" />
              <div>
                <CardTitle className="text-orange-900">
                  {periodStatus.action === 'suggest_next' ? 'Crear Nuevo Período' : 'Configurar Período'}
                </CardTitle>
                <p className="text-sm text-orange-700 mt-1">
                  {periodStatus.message}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onRefreshPeriod && (
                <Button 
                  onClick={onRefreshPeriod} 
                  variant="outline" 
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              )}
              {periodStatus.action === 'suggest_next' && periodStatus.nextPeriod && onCreateNewPeriod && (
                <Button 
                  onClick={onCreateNewPeriod}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Período
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {periodStatus.nextPeriod && (
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-orange-800">Tipo:</span>
                <p className="text-orange-700 capitalize">{periodStatus.nextPeriod.type}</p>
              </div>
              <div>
                <span className="font-medium text-orange-800">Fecha Inicio:</span>
                <p className="text-orange-700">
                  {format(new Date(periodStatus.nextPeriod.startDate), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
              <div>
                <span className="font-medium text-orange-800">Fecha Fin:</span>
                <p className="text-orange-700">
                  {format(new Date(periodStatus.nextPeriod.endDate), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Mostrar período activo
  if (period) {
    const getStatusColor = (estado: string) => {
      switch (estado) {
        case 'borrador': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'en_proceso': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'cerrado': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getStatusIcon = (estado: string) => {
      switch (estado) {
        case 'borrador': return <Clock className="h-4 w-4" />;
        case 'en_proceso': return <Calculator className="h-4 w-4" />;
        case 'cerrado': return <CheckCircle2 className="h-4 w-4" />;
        default: return <Clock className="h-4 w-4" />;
      }
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">
                  Período: {period.periodo}
                </CardTitle>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge className={getStatusColor(period.estado)}>
                    {getStatusIcon(period.estado)}
                    <span className="ml-1 capitalize">{period.estado}</span>
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {format(new Date(period.fecha_inicio), 'dd/MM/yyyy', { locale: es })} - {' '}
                    {format(new Date(period.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {onRefreshPeriod && (
                <Button 
                  onClick={onRefreshPeriod} 
                  variant="outline" 
                  size="sm"
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              )}
              
              {onRecalculateAll && period.estado === 'borrador' && (
                <Button 
                  onClick={onRecalculateAll}
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Recalcular Todo
                </Button>
              )}
              
              {canClosePeriod && onClosePeriod && (
                <Button 
                  onClick={onClosePeriod}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Cerrando...' : 'Cerrar Período'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados</p>
                <p className="text-lg font-semibold">
                  {selectedCount > 0 ? `${selectedCount}/${totalCount}` : totalCount}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devengado</p>
                <p className="text-lg font-semibold">
                  ${period.total_devengado?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Deducciones</p>
                <p className="text-lg font-semibold">
                  ${period.total_deducciones?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Neto a Pagar</p>
                <p className="text-lg font-semibold">
                  ${period.total_neto?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado por defecto
  return (
    <Card className="border-gray-200">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay período activo
          </h3>
          <p className="text-gray-600 mb-4">
            Configure un período de nómina para comenzar la liquidación
          </p>
          {onRefreshPeriod && (
            <Button onClick={onRefreshPeriod} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Buscar Períodos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
