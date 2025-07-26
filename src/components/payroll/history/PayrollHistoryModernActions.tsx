import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, Clock } from 'lucide-react';

interface PendingNovedad {
  id: string;
  empleado_id: string;
  tipo_novedad: string;
  concepto: string;
  valor: number;
  estado: string;
}

interface PayrollHistoryModernActionsProps {
  pendingNovedades: PendingNovedad[];
  isLoading: boolean;
  onApplyPendingAdjustments: () => void;
  canApplyAdjustments: boolean;
}

export const PayrollHistoryModernActions = ({
  pendingNovedades,
  isLoading,
  onApplyPendingAdjustments,
  canApplyAdjustments
}: PayrollHistoryModernActionsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const pendingAdjustments = pendingNovedades.filter(n => n.estado === 'pending');
  const totalPendingValue = pendingAdjustments.reduce((sum, nov) => {
    return sum + (nov.tipo_novedad === 'deduccion' ? -nov.valor : nov.valor);
  }, 0);

  if (pendingAdjustments.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <CardTitle className="text-yellow-800">
            Ajustes Pendientes
          </CardTitle>
          <Badge variant="outline" className="border-yellow-300 text-yellow-700">
            {pendingAdjustments.length} pendiente{pendingAdjustments.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Hay {pendingAdjustments.length} ajuste{pendingAdjustments.length !== 1 ? 's' : ''} pendiente{pendingAdjustments.length !== 1 ? 's' : ''} por aplicar
              </p>
              {totalPendingValue !== 0 && (
                <p className="text-sm font-medium">
                  Impacto total: {formatCurrency(Math.abs(totalPendingValue))}
                  <span className={`ml-1 ${totalPendingValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({totalPendingValue > 0 ? '+' : ''}{formatCurrency(totalPendingValue)})
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onApplyPendingAdjustments}
                disabled={!canApplyAdjustments || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Aplicar Ajustes
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            {pendingAdjustments.slice(0, 3).map((novedad) => (
              <div key={novedad.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {novedad.concepto}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {novedad.tipo_novedad === 'deduccion' ? 'Deducción' : 'Devengado'}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  novedad.tipo_novedad === 'deduccion' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {novedad.tipo_novedad === 'deduccion' ? '-' : '+'}{formatCurrency(novedad.valor)}
                </div>
              </div>
            ))}
            
            {pendingAdjustments.length > 3 && (
              <div className="text-center py-2 text-sm text-muted-foreground">
                y {pendingAdjustments.length - 3} más...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};