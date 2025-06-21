
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Users, DollarSign, Minus, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PayrollSummary } from '@/types/payroll';

interface PayrollSummaryPanelProps {
  summary: PayrollSummary;
  onClose: () => void;
}

export const PayrollSummaryPanel = ({ summary, onClose }: PayrollSummaryPanelProps) => {
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
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Resumen de Nómina</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
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
    </div>
  );
};
