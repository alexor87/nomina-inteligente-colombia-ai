
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Minus, Calculator, Building2 } from 'lucide-react';
import { PayrollSummary } from '@/types/payroll';

interface PayrollSummaryCardsProps {
  summary: PayrollSummary;
}

export const PayrollSummaryCards = ({ summary }: PayrollSummaryCardsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getValidationStatus = () => {
    const percentage = (summary.validEmployees / summary.totalEmployees) * 100;
    if (percentage === 100) {
      return { color: 'bg-green-100 text-green-800', text: 'Todos válidos' };
    } else if (percentage >= 80) {
      return { color: 'bg-yellow-100 text-yellow-800', text: `${Math.round(percentage)}% válidos` };
    } else {
      return { color: 'bg-red-100 text-red-800', text: `${Math.round(percentage)}% válidos` };
    }
  };

  const validationStatus = getValidationStatus();

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Empleados */}
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Empleados</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</div>
              </div>
            </div>
            <div className="mt-2">
              <Badge className={`${validationStatus.color} text-xs`}>
                {validationStatus.text}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Devengado */}
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Devengado</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalGrossPay)}
            </div>
          </CardContent>
        </Card>

        {/* Deducciones */}
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Minus className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Deducciones</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalDeductions)}
            </div>
          </CardContent>
        </Card>

        {/* Neto a pagar */}
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Neto a Pagar</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalNetPay)}
            </div>
          </CardContent>
        </Card>

        {/* Costo total */}
        <Card className="border-2 border-gray-300 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Costo Total</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary.totalPayrollCost)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Incluye aportes empleador
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
