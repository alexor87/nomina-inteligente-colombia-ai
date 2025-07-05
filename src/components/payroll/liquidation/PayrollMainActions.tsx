
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PayrollMainActionsProps {
  selectedCount: number;
  totalCount: number;
  canLiquidate: boolean;
  isProcessing: boolean;
  onLiquidate: () => void;
  onRecalculate: () => void;
}

/**
 * ✅ COMPONENTE DE ACCIONES PRINCIPALES DE NÓMINA
 * Incluye el botón principal "Liquidar nómina"
 */
export const PayrollMainActions: React.FC<PayrollMainActionsProps> = ({
  selectedCount,
  totalCount,
  canLiquidate,
  isProcessing,
  onLiquidate,
  onRecalculate
}) => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Información de empleados */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">
                {selectedCount} de {totalCount} empleados seleccionados
              </span>
            </div>
            
            {selectedCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Listos para liquidar
              </Badge>
            )}
          </div>

          {/* Acciones principales */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={onRecalculate}
              variant="outline"
              disabled={isProcessing || totalCount === 0}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Recalcular
            </Button>

            <Button
              onClick={onLiquidate}
              disabled={!canLiquidate || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Liquidar nómina
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mensaje de ayuda */}
        {selectedCount === 0 && totalCount > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              💡 Seleccione al menos un empleado para poder liquidar la nómina
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
