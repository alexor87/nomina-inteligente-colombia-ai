
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Minus, Calculator, CheckCircle, TrendingUp } from 'lucide-react';
import { PayrollSummary } from '@/types/payroll';

interface PayrollSummaryPanelProps {
  summary: PayrollSummary;
  selectedCount: number;
  totalCount: number;
}

export const PayrollSummaryPanel = ({ summary, selectedCount, totalCount }: PayrollSummaryPanelProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getValidationStatus = () => {
    const percentage = summary.totalEmployees > 0 ? (summary.validEmployees / summary.totalEmployees) * 100 : 0;
    if (percentage === 100) {
      return { color: 'text-green-600', bgColor: 'bg-green-50', text: 'Todos válidos' };
    } else if (percentage >= 80) {
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', text: `${Math.round(percentage)}% válidos` };
    } else {
      return { color: 'text-red-600', bgColor: 'bg-red-50', text: `${Math.round(percentage)}% válidos` };
    }
  };

  const validationStatus = getValidationStatus();

  const summaryCards = [
    {
      title: 'Empleados',
      value: `${summary.validEmployees}/${summary.totalEmployees}`,
      subtitle: validationStatus.text,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      badge: `${selectedCount}/${totalCount} seleccionados`
    },
    {
      title: 'Devengado',
      value: formatCurrency(summary.totalGrossPay),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Deducciones',
      value: formatCurrency(summary.totalDeductions),
      icon: Minus,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Neto a Pagar',
      value: formatCurrency(summary.totalNetPay),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Aportes Empleador',
      value: formatCurrency(summary.employerContributions),
      icon: CheckCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Costo Total',
      value: formatCurrency(summary.totalPayrollCost),
      subtitle: 'Incluye neto + aportes',
      icon: Calculator,
      color: 'text-gray-900',
      bgColor: 'bg-gray-50',
      highlight: true
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Resumen de Nómina</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card 
              key={index} 
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                card.highlight ? 'ring-2 ring-gray-300 shadow-md' : 'shadow-sm'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${card.bgColor}`}>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-600 truncate">
                        {card.title}
                      </span>
                    </div>
                    
                    <div className={`text-xl font-bold ${card.color} mb-1 break-words`}>
                      {card.value}
                    </div>
                    
                    {card.subtitle && (
                      <div className="text-xs text-gray-500">
                        {card.subtitle}
                      </div>
                    )}
                    
                    {card.badge && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
