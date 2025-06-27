
import { Button } from '@/components/ui/button';
import { PayrollPeriod } from '@/services/PayrollPeriodService';

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
    return `${startDay}-${endDay} /${month}/ ${year}`;
  };

  const getStatusEmoji = () => {
    switch (period.estado) {
      case 'borrador': return '🟡';
      case 'aprobado': return '🟢';
      case 'cerrado': return '🔒';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white px-6 py-4 mb-6">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="text-gray-700 text-lg">
          {formatPeriod()} {getStatusEmoji()}
        </div>

        {isValid && canEdit && period.estado === 'borrador' && (
          <Button
            onClick={onApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Aprobar período
          </Button>
        )}
      </div>
    </div>
  );
};
