
/**
 * ✅ COMPONENTE SIMPLE PARA MOSTRAR IBC
 * Fácil de entender y mantener
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';

interface IBCDisplayKISSProps {
  ibc: number;
  salarioBase: number;
  novedadesConstitutivas: number;
  aplicoLimites: boolean;
  detalles: any;
}

export const IBCDisplayKISS: React.FC<IBCDisplayKISSProps> = ({
  ibc,
  salarioBase,
  novedadesConstitutivas,
  aplicoLimites,
  detalles
}) => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Calculator className="h-5 w-5" />
          Ingreso Base de Cotización (IBC)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* IBC Final */}
        <div className="flex justify-between items-center">
          <span className="font-medium text-blue-700">IBC Final:</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-blue-900">
              ${ibc.toLocaleString()}
            </span>
            {aplicoLimites && (
              <Badge variant="outline" className="text-orange-700 border-orange-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Límites aplicados
              </Badge>
            )}
          </div>
        </div>

        {/* Composición del IBC */}
        <div className="bg-white p-3 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700 font-medium mb-2">Composición:</div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Salario base:</span>
              <span>${salarioBase.toLocaleString()}</span>
            </div>
            
            {novedadesConstitutivas > 0 && (
              <div className="flex justify-between text-green-700">
                <span>+ Novedades constitutivas:</span>
                <span>${novedadesConstitutivas.toLocaleString()}</span>
              </div>
            )}
            
            <div className="border-t pt-1 flex justify-between font-medium">
              <span>Total antes de límites:</span>
              <span>${detalles.ibcAntesLimites.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Indicador de cumplimiento normativo */}
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-700">
            Cumple límites normativos (1-25 SMMLV)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
