
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, Calendar } from 'lucide-react';
import { PayrollPeriod } from '@/services/PayrollPeriodService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';

interface PayrollModernHeaderProps {
  period: PayrollPeriod | null;
  isValid: boolean;
  canEdit: boolean;
  onApprove: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const PayrollModernHeader = ({
  period,
  isValid,
  canEdit,
  onApprove,
  onRefresh,
  isLoading
}: PayrollModernHeaderProps) => {
  if (!period) return null;

  const formatPeriod = () => {
    if (!period.fecha_inicio || !period.fecha_fin) return 'Período no definido';
    const start = new Date(period.fecha_inicio);
    const end = new Date(period.fecha_fin);
    const startDay = start.getDate();
    const endDay = end.getDate();
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = monthNames[start.getMonth()];
    const year = start.getFullYear();
    return `${startDay} ${month} – ${endDay} ${month} ${year}`;
  };

  const getStatusEmoji = () => {
    switch (period.estado) {
      case 'borrador': return '🟡';
      case 'aprobado': return '🟢';
      case 'cerrado': return '🔒';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    switch (period.estado) {
      case 'borrador': return 'Borrador';
      case 'aprobado': return 'Aprobado';
      case 'cerrado': return 'Cerrado';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-700">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Estás liquidando:</span>
            <span className="font-medium">{formatPeriod()}</span>
            <span className="text-gray-400">|</span>
            <span className="flex items-center space-x-1">
              <span>{getStatusEmoji()}</span>
              <span className="text-sm">{getStatusText()}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          {isValid && canEdit && period.estado === 'borrador' && (
            <Button
              onClick={onApprove}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              ✅ Aprobar período
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
