
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText } from 'lucide-react';

interface VoucherEmptyStateProps {
  onNavigateToPayroll?: () => void;
}

export const VoucherEmptyState = ({ onNavigateToPayroll }: VoucherEmptyStateProps) => {
  const handleNavigateToPayroll = () => {
    if (onNavigateToPayroll) {
      onNavigateToPayroll();
    } else {
      window.location.href = '/payroll';
    }
  };

  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-4 bg-blue-50 rounded-full">
          <AlertCircle className="h-12 w-12 text-blue-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            No hay comprobantes disponibles
          </h3>
          <p className="text-gray-500 max-w-md">
            Los comprobantes se generan automáticamente cuando procesas y apruebas una nómina. 
            Primero debes liquidar un período de nómina.
          </p>
        </div>
        <div className="pt-4">
          <Button 
            onClick={handleNavigateToPayroll}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Ir a Liquidar Nómina
          </Button>
        </div>
      </div>
    </Card>
  );
};
