
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PayrollEmployee } from '@/types/payroll';
import { AlertTriangle } from 'lucide-react';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  onRecalculate?: (employeeId: string) => void;
  onViewDetails?: (employeeId: string) => void;
  isRecalculating?: boolean;
}

export function PayrollLiquidationSimpleTable({
  employees,
  onRecalculate,
  onViewDetails,
  isRecalculating = false
}: PayrollLiquidationSimpleTableProps) {
  
  // ✅ FUNCIÓN DE VALIDACIÓN: Detectar discrepancias en neto pagado
  const validateNetPay = (employee: PayrollEmployee) => {
    const expectedNetPay = employee.grossPay - employee.deductions + employee.transportAllowance;
    const actualNetPay = employee.netPay;
    const discrepancy = Math.abs(expectedNetPay - actualNetPay);
    
    // Si la discrepancia es mayor a 1000 pesos, es significativa
    const hasDiscrepancy = discrepancy > 1000;
    
    return {
      hasDiscrepancy,
      expectedNetPay,
      actualNetPay,
      discrepancy,
      correctedNetPay: hasDiscrepancy ? expectedNetPay : actualNetPay
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidación de Nómina</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Empleado</th>
                <th className="text-right p-2 font-medium">Salario Base</th>
                <th className="text-right p-2 font-medium">Días</th>
                <th className="text-right p-2 font-medium">Total Devengado</th>
                <th className="text-right p-2 font-medium">Deducciones</th>
                <th className="text-right p-2 font-medium">Aux. Transporte</th>
                <th className="text-right p-2 font-medium">Neto Pagado</th>
                <th className="text-center p-2 font-medium">Estado</th>
                <th className="text-center p-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const validation = validateNetPay(employee);
                
                return (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.position}</div>
                      </div>
                    </td>
                    <td className="p-2 text-right">{formatCurrency(employee.baseSalary)}</td>
                    <td className="p-2 text-right">{employee.workedDays}</td>
                    <td className="p-2 text-right">{formatCurrency(employee.grossPay)}</td>
                    <td className="p-2 text-right">{formatCurrency(employee.deductions)}</td>
                    <td className="p-2 text-right">{formatCurrency(employee.transportAllowance)}</td>
                    <td className="p-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className={validation.hasDiscrepancy ? 'line-through text-red-500 text-sm' : ''}>
                          {formatCurrency(employee.netPay)}
                        </span>
                        {validation.hasDiscrepancy && (
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <span>{formatCurrency(validation.correctedNetPay)}</span>
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={employee.status === 'valid' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {employee.status === 'valid' ? 'Válido' : 'Error'}
                        </Badge>
                        {validation.hasDiscrepancy && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            Ajustado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1">
                        {onViewDetails && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(employee.id)}
                            className="text-xs"
                          >
                            Ver
                          </Button>
                        )}
                        {onRecalculate && validation.hasDiscrepancy && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRecalculate(employee.id)}
                            disabled={isRecalculating}
                            className="text-xs bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                          >
                            {isRecalculating ? 'Calculando...' : 'Corregir'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay empleados cargados para este período
          </div>
        )}

        {/* ✅ RESUMEN DE DISCREPANCIAS */}
        {employees.some(emp => validateNetPay(emp).hasDiscrepancy) && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-orange-800">
                  Discrepancias Detectadas en Cálculos
                </h4>
                <p className="text-xs text-orange-700 mt-1">
                  Se detectaron diferencias en el neto pagado. Los valores corregidos se muestran en verde.
                  Fórmula correcta: Neto = Total Devengado - Deducciones + Auxilio Transporte
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
