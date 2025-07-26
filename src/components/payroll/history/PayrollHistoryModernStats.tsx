import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, Percent } from 'lucide-react';

interface PayrollHistoryModernStatsProps {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
}

export const PayrollHistoryModernStats = ({
  totalEmployees,
  totalGrossPay,
  totalDeductions,
  totalNetPay
}: PayrollHistoryModernStatsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const deductionRate = totalGrossPay > 0 ? (totalDeductions / totalGrossPay) * 100 : 0;

  const stats = [
    {
      title: 'Total Empleados',
      value: totalEmployees.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Devengado',
      value: formatCurrency(totalGrossPay),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Deducciones',
      value: formatCurrency(totalDeductions),
      icon: Percent,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      subtitle: `${deductionRate.toFixed(1)}% del devengado`,
    },
    {
      title: 'Total Neto',
      value: formatCurrency(totalNetPay),
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};