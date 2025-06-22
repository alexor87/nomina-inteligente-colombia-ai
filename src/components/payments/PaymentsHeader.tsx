
import { CreditCard, Download, FileText, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentPeriod } from '@/types/payments';

interface PaymentsHeaderProps {
  period: PaymentPeriod;
  onDownloadReport: () => void;
}

export const PaymentsHeader = ({ period, onDownloadReport }: PaymentsHeaderProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pagos y Dispersión</h1>
            <p className="text-lg text-gray-600">Período: {period.periodName}</p>
            <p className="text-sm text-gray-500">
              Estado: <span className="capitalize font-medium">{period.status}</span>
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={onDownloadReport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Reporte de pagos</span>
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Comprobantes</span>
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <History className="h-4 w-4" />
            <span>Historial</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
