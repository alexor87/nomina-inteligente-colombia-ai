
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadBreakdownDisplayProps {
  novedad: {
    id: string;
    tipo_novedad: string;
    subtipo?: string;
    valor: number;
    dias?: number;
    horas?: number;
    base_calculo?: {
      valor_original_usuario?: number;
      valor_calculado?: number;
      detalle_calculo?: string;
      policy_snapshot?: any;
    };
  };
  employeeName: string;
  showFullDetails?: boolean;
}

export const NovedadBreakdownDisplay: React.FC<NovedadBreakdownDisplayProps> = ({
  novedad,
  employeeName,
  showFullDetails = false
}) => {
  const hasBreakdown = novedad.base_calculo;
  const isAdjusted = hasBreakdown && 
    novedad.base_calculo.valor_original_usuario !== novedad.base_calculo.valor_calculado;
  
  const getTypeLabel = (tipo: string, subtipo?: string) => {
    if (tipo === 'incapacidad') {
      return `Incapacidad ${subtipo === 'laboral' ? 'Laboral (ARL)' : 'General (EPS)'}`;
    }
    return tipo.replace('_', ' ').toUpperCase();
  };

  return (
    <Card className={`${isAdjusted ? 'border-orange-200' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{getTypeLabel(novedad.tipo_novedad, novedad.subtipo)} - {employeeName}</span>
          {isAdjusted && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Ajustado por Política
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Valor aplicado en nómina:</span>
            <div className="font-semibold text-lg">
              {formatCurrency(novedad.valor)}
            </div>
          </div>
          
          {(novedad.dias || novedad.horas) && (
            <div>
              <span className="text-gray-600">
                {novedad.dias ? 'Días:' : 'Horas:'}
              </span>
              <div className="font-semibold">
                {novedad.dias || novedad.horas}
              </div>
            </div>
          )}
        </div>

        {hasBreakdown && showFullDetails && (
          <div className="space-y-3 border-t pt-3">
            <div className="text-xs font-medium text-gray-700">Detalle del Cálculo:</div>
            
            {novedad.base_calculo.detalle_calculo && (
              <div className="bg-blue-50 p-2 rounded text-xs border">
                <div className="flex items-start gap-2">
                  <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>{novedad.base_calculo.detalle_calculo}</span>
                </div>
              </div>
            )}

            {isAdjusted && (
              <div className="bg-orange-50 p-2 rounded text-xs border border-orange-200">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Valor original:</span>
                    <span className="font-mono">{formatCurrency(novedad.base_calculo.valor_original_usuario || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Valor ajustado:</span>
                    <span className="font-mono">{formatCurrency(novedad.base_calculo.valor_calculado || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {novedad.base_calculo.policy_snapshot && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <div>Calculado: {new Date(novedad.base_calculo.policy_snapshot.calculation_date).toLocaleString()}</div>
                <div>Salario base: {formatCurrency(novedad.base_calculo.policy_snapshot.salary_used)}</div>
              </div>
            )}
          </div>
        )}

        {!hasBreakdown && (
          <div className="bg-yellow-50 p-2 rounded text-xs border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-3 w-3" />
              <span>Novedad registrada antes de la implementación de políticas detalladas</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
