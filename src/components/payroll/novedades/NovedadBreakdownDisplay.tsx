
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BaseCalculoData } from '@/types/novedades-enhanced';

interface NovedadBreakdownDisplayProps {
  baseCalculo: BaseCalculoData;
  showFullDetails?: boolean;
}

export const NovedadBreakdownDisplay: React.FC<NovedadBreakdownDisplayProps> = ({
  baseCalculo,
  showFullDetails = true
}) => {
  const isAdjusted = baseCalculo.valor_original_usuario !== baseCalculo.valor_calculado;
  
  return (
    <Card className={`${isAdjusted ? 'border-orange-200' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Detalle del Cálculo</span>
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
            <span className="text-gray-600">Valor calculado:</span>
            <div className="font-semibold text-lg">
              {formatCurrency(baseCalculo.valor_calculado)}
            </div>
          </div>
          
          <div>
            <span className="text-gray-600">Salario base:</span>
            <div className="font-semibold">
              {formatCurrency(baseCalculo.salario_base)}
            </div>
          </div>
        </div>

        {showFullDetails && (
          <div className="space-y-3 border-t pt-3">
            <div className="text-xs font-medium text-gray-700">Detalle del Cálculo:</div>
            
            {baseCalculo.detalle_calculo && (
              <div className="bg-blue-50 p-2 rounded text-xs border">
                <div className="flex items-start gap-2">
                  <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>{baseCalculo.detalle_calculo}</span>
                </div>
              </div>
            )}

            {isAdjusted && (
              <div className="bg-orange-50 p-2 rounded text-xs border border-orange-200">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Valor original:</span>
                    <span className="font-mono">{formatCurrency(baseCalculo.valor_original_usuario || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Valor ajustado:</span>
                    <span className="font-mono">{formatCurrency(baseCalculo.valor_calculado || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {baseCalculo.policy_snapshot && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <div>Calculado: {new Date(baseCalculo.policy_snapshot.calculation_date).toLocaleString()}</div>
                <div>Salario base: {formatCurrency(baseCalculo.policy_snapshot.salary_used)}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
