
import { Button } from '@/components/ui/button';
import { PayrollPeriod } from '@/types/payroll';
import { PayrollSummary } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';

interface PayrollModernHeaderProps {
  period: PayrollPeriod | null;
  summary: PayrollSummary;
}

export const PayrollModernHeader = ({
  period,
  summary
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
    return `${startDay}-${endDay} ${month} ${year}`;
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Nómina del período {formatPeriod()}
            </h1>
          </div>

          <Button
            variant="outline"
            onClick={() => window.location.href = '/app/payroll-history'}
          >
            Historial de períodos
          </Button>
        </div>
      </div>
    </div>
  );
};
