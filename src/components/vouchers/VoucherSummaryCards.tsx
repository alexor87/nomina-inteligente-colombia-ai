
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { VoucherSummary } from '@/types/vouchers';
import { FileText, Mail, Clock, CheckCircle2 } from 'lucide-react';

interface VoucherSummaryCardsProps {
  summary: VoucherSummary;
}

export const VoucherSummaryCards = ({ summary }: VoucherSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total de comprobantes */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Comprobantes</p>
            <p className="text-3xl font-bold text-gray-900">{summary.totalVouchers}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </Card>

      {/* Generados */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Generados</p>
            <p className="text-3xl font-bold text-gray-900">{summary.generatedVouchers}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Comprobantes completados
        </p>
      </Card>

      {/* Enviados a empleados */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Enviados</p>
            <p className="text-3xl font-bold text-gray-900">{summary.sentPercentage}%</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <Progress 
          value={summary.sentPercentage} 
          className="h-2"
        />
        <p className="text-xs text-gray-500 mt-2">
          {Math.round((summary.sentPercentage / 100) * summary.totalVouchers)} de {summary.totalVouchers} enviados
        </p>
      </Card>

      {/* Pendientes */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pendientes</p>
            <p className="text-3xl font-bold text-orange-600">{summary.pendingVouchers}</p>
          </div>
          <div className="p-3 bg-orange-100 rounded-full">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Requieren procesamiento
        </p>
      </Card>
    </div>
  );
};
