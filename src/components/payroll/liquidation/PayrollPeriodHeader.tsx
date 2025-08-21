
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, RefreshCw, Save, Calculator, Users, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PeriodStatus } from '@/types/payroll';

interface PayrollPeriodHeaderProps {
  period: any | null;
  periodStatus: PeriodStatus | null;
  onCreateNewPeriod: () => Promise<void>;
  onRefreshPeriod: () => Promise<void>;
  canClosePeriod?: boolean;
  isProcessing?: boolean;
  onClosePeriod?: () => Promise<void>;
  onRecalculateAll?: () => Promise<void>;
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
  const getStatusBadge = (estado: string) => {
    const statusConfig = {
      'borrador': { label: 'Borrador', className: 'bg-gray-100 text-gray-800' },
      'cerrado': { label: 'Cerrado', className: 'bg-green-100 text-green-800' },
      'procesado': { label: 'Procesado', className: 'bg-blue-100 text-blue-800' },
      'aprobado': { label: 'Aprobado', className: 'bg-emerald-100 text-emerald-800' }
    };
    
    const config = statusConfig[estado as keyof typeof statusConfig] || statusConfig.borrador;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Si no hay período, mostrar opción para crear
  if (!period) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <CalendarDays className="h-5 w-5" />
              <span>No hay período activo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {periodStatus?.message || 'Crea un nuevo período para comenzar la liquidación'}
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Button 
                onClick={onCreateNewPeriod}
                disabled={isProcessing}
                variant="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                {periodStatus?.suggestion || 'Crear Período'}
              </Button>
              <Button 
                variant="outline" 
                onClick={onRefreshPeriod}
                disabled={isProcessing}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold">
                Período: {period.periodo}
              </h2>
              {getStatusBadge(period.estado)}
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <CalendarDays className="h-4 w-4" />
                <span>{period.fecha_inicio} - {period.fecha_fin}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{totalCount} empleados</span>
              </div>
              {selectedCount > 0 && (
                <span className="text-blue-600 font-medium">
                  {selectedCount} seleccionados
                </span>
              )}
            </div>

            {/* Totales del período */}
            {period.total_devengado > 0 && (
              <div className="flex items-center space-x-6 text-sm">
                <span>
                  <strong>Devengado:</strong> {formatCurrency(period.total_devengado)}
                </span>
                <span>
                  <strong>Deducciones:</strong> {formatCurrency(period.total_deducciones)}
                </span>
                <span>
                  <strong>Neto:</strong> {formatCurrency(period.total_neto)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {period.estado === 'borrador' && (
              <>
                {onRecalculateAll && (
                  <Button 
                    variant="outline" 
                    onClick={onRecalculateAll}
                    disabled={isProcessing}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Recalcular Todo
                  </Button>
                )}

                {onClosePeriod && (
                  <Button 
                    onClick={onClosePeriod}
                    disabled={!canClosePeriod || isProcessing}
                    variant="default"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Cerrando...' : 'Cerrar Período'}
                  </Button>
                )}
              </>
            )}

            <Button 
              variant="outline" 
              onClick={onRefreshPeriod}
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
