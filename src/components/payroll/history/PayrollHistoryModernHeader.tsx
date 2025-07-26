import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';

interface PeriodDetail {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
  estado: string;
}

interface PayrollHistoryModernHeaderProps {
  period: PeriodDetail | null;
}

export const PayrollHistoryModernHeader = ({ period }: PayrollHistoryModernHeaderProps) => {
  const navigate = useNavigate();

  if (!period) return null;

  const formatPeriod = () => {
    if (!period.fecha_inicio || !period.fecha_fin) return 'Período no definido';
    return PayrollPeriodService.formatPeriodText(period.fecha_inicio, period.fecha_fin);
  };

  const getStatusBadge = () => {
    const isAdjusted = period.estado === 'adjusted' || period.estado === 'closed_with_adjustments';
    if (isAdjusted) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Con ajustes
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/payroll-history')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al historial
            </Button>
            <div className="border-l border-border h-6"></div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Detalle de Nómina
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatPeriod()} • {period.tipo_periodo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              period.estado === 'open' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {period.estado === 'open' ? 'Abierto' : 'Cerrado'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};