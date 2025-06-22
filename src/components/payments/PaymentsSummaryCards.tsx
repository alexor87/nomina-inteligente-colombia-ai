
import { Progress } from '@/components/ui/progress';

interface PaymentsSummary {
  totalEmployees: number;
  totalAmount: number;
  totalPaid: number;
  totalFailed: number;
  paidCount: number;
  failedCount: number;
  progressPercentage: number;
}

interface PaymentsSummaryCardsProps {
  summary: PaymentsSummary;
}

export const PaymentsSummaryCards = ({ summary }: PaymentsSummaryCardsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total empleados */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total empleados</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <span className="text-blue-600 text-xl">👥</span>
          </div>
        </div>
      </div>

      {/* Total a dispersar */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total a dispersar</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <span className="text-green-600 text-xl">💰</span>
          </div>
        </div>
      </div>

      {/* Total pagado */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total pagado</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-sm text-gray-500">{summary.paidCount} empleados</p>
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <span className="text-green-600 text-xl">✅</span>
          </div>
        </div>
      </div>

      {/* Total fallido */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total fallido</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalFailed)}</p>
            <p className="text-sm text-gray-500">{summary.failedCount} empleados</p>
          </div>
          <div className="bg-red-100 p-3 rounded-full">
            <span className="text-red-600 text-xl">❌</span>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 md:col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Progreso de dispersión</h3>
          <span className="text-lg font-bold text-blue-600">{summary.progressPercentage}% completado</span>
        </div>
        <Progress value={summary.progressPercentage} className="h-3" />
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>{summary.paidCount} pagados</span>
          <span>{summary.totalEmployees - summary.paidCount} pendientes</span>
        </div>
      </div>
    </div>
  );
};
