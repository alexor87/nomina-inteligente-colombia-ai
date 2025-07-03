
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Minus, Calculator } from 'lucide-react';
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
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Resumen de Nómina</h3>
        <Badge variant="outline">
          {selectedCount}/{totalCount} seleccionados
        </Badge>
      </div>

      {/* Empleados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Empleados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="font-medium">{summary.totalEmployees}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Estado:</span>
              <Badge className={validationStatus.color}>
                {validationStatus.text}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devengado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Devengado
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(summary.totalGrossPay)}
          </div>
        </CardContent>
      </Card>

      {/* Deducciones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Minus className="h-4 w-4 mr-2" />
            Deducciones
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-bold text-red-600">
            {formatCurrency(summary.totalDeductions)}
          </div>
        </CardContent>
      </Card>

      {/* Neto a pagar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Neto a Pagar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold text-blue-600">
            {formatCurrency(summary.totalNetPay)}
          </div>
        </CardContent>
      </Card>

      {/* Aportes empleador */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Aportes Empleador</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-semibold text-purple-600">
            {formatCurrency(summary.employerContributions)}
          </div>
        </CardContent>
      </Card>

      {/* Costo total */}
      <Card className="border-2 border-gray-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Calculator className="h-4 w-4 mr-2" />
            Costo Total Nómina
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold text-gray-900">
            {formatCurrency(summary.totalPayrollCost)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Incluye neto + aportes
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
