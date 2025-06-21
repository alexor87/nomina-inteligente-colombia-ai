
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'in_progress' | 'closed' | 'approved';
  type: 'quincenal' | 'mensual';
}

interface PayrollPeriodHeaderProps {
  period: PayrollPeriod;
  isLoading: boolean;
}

const statusConfig = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-800', icon: Clock },
  closed: { label: 'Cerrado', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

export const PayrollPeriodHeader = ({ period, isLoading }: PayrollPeriodHeaderProps) => {
  const config = statusConfig[period.status];
  const StatusIcon = config.icon;

  const formatPeriod = () => {
    const start = new Date(period.startDate).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long'
    });
    const end = new Date(period.endDate).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return `Del ${start} al ${end}`;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidar Nómina</h1>
          <div className="flex items-center space-x-2 mt-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{formatPeriod()}</span>
            <Badge className={`${config.color} flex items-center space-x-1`}>
              <StatusIcon className="h-3 w-3" />
              <span>{config.label}</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Button 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Cambiar período
        </Button>
      </div>
    </div>
  );
};
