
import { Card } from '@/components/ui/card';
import { PayrollSummary } from '@/types/payroll';
import { Users, DollarSign, TrendingUp, Calculator } from 'lucide-react';

interface PayrollSummaryCardsProps {
  summary: PayrollSummary;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const PayrollSummaryCards = ({ summary }: PayrollSummaryCardsProps) => {
  const cards = [
    {
      title: 'Empleados válidos',
      value: `${summary.validEmployees}/${summary.totalEmployees}`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      title: 'Total devengado',
      value: formatCurrency(summary.totalGrossPay),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100'
    },
    {
      title: 'Total deducciones',
      value: formatCurrency(summary.totalDeductions),
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100'
    },
    {
      title: 'Neto a pagar',
      value: formatCurrency(summary.totalNetPay),
      icon: Calculator,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className={`p-6 border-gray-200 shadow-sm ${card.borderColor}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-xl font-semibold text-gray-900 truncate">{card.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
