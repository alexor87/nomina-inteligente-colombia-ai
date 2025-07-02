
import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Calculator } from 'lucide-react';
import { PayrollSummary } from '@/types/payroll';

interface PayrollSummaryStatsProps {
  summary: PayrollSummary;
  isLoading?: boolean;
}

export const PayrollSummaryStats: React.FC<PayrollSummaryStatsProps> = ({ 
  summary, 
  isLoading = false 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      title: 'Total Empleados',
      value: summary.totalEmployees.toString(),
      subValue: `${summary.validEmployees} válidos`,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Total Devengado',
      value: formatCurrency(summary.totalGrossPay),
      subValue: 'Salarios + bonificaciones',
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Total Deducciones',
      value: formatCurrency(summary.totalDeductions),
      subValue: 'Descuentos aplicados',
      icon: Calculator,
      color: 'red'
    },
    {
      title: 'Neto a Pagar',
      value: formatCurrency(summary.totalNetPay),
      subValue: 'Total para empleados',
      icon: DollarSign,
      color: 'purple'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${colorClasses[stat.color]}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {stat.title}
              </p>
              
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.subValue}
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
