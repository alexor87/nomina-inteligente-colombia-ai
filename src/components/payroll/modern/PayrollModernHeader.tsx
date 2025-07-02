
import { Button } from '@/components/ui/button';
import { PayrollPeriod } from '@/types/payroll';
import { PayrollSummary } from '@/types/payroll';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';

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
    return PayrollPeriodService.formatPeriodText(period.fecha_inicio, period.fecha_fin);
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
