
import { PayrollSummary } from '@/types/payroll';
import { Users, DollarSign, TrendingDown, Calculator } from 'lucide-react';

interface PayrollModernSummaryProps {
  summary: PayrollSummary;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const PayrollModernSummary = ({ summary }: PayrollModernSummaryProps) => {
  const cards = [
    {
      emoji: '👤',
      label: 'Empleados válidos',
      value: `${summary.validEmployees}/${summary.totalEmployees}`,
      color: summary.validEmployees === summary.totalEmployees ? 'text-green-600' : 'text-amber-600'
    },
    {
      emoji: '💵',
      label: 'Total devengado',
      value: formatCurrency(summary.totalGrossPay),
      color: 'text-green-600'
    },
    {
      emoji: '💸',
      label: 'Total deducciones',
      value: formatCurrency(summary.totalDeductions),
      color: 'text-red-600'
    },
    {
      emoji: '🧾',
      label: 'Neto a pagar',
      value: formatCurrency(summary.totalNetPay),
      color: 'text-blue-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{card.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">{card.label}</p>
              <p className={`text-xl font-semibold ${card.color} truncate`}>
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
