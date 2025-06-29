
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { Calculator, X } from 'lucide-react';

interface EmployeeCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee | null;
}

export const EmployeeCalculationModal: React.FC<EmployeeCalculationModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  if (!employee) return null;

  const dailySalary = employee.baseSalary / 30;
  const hourlySalary = employee.baseSalary / 240;
  const workedSalary = dailySalary * employee.workedDays;
  const extraHoursPay = employee.extraHours * hourlySalary * 1.25;
  const healthContribution = employee.baseSalary * 0.04;
  const pensionContribution = employee.baseSalary * 0.04;
  const transportAllowance = employee.baseSalary <= 2600000 ? 200000 : 0;

  const calculations = [
    {
      title: "Salario Proporcional",
      formula: `(Salario Base ÷ 30) × Días Trabajados`,
      calculation: `(${formatCurrency(employee.baseSalary)} ÷ 30) × ${employee.workedDays}`,
      result: formatCurrency(workedSalary)
    },
    {
      title: "Horas Extra Diurnas",
      formula: `(Salario Base ÷ 240) × 1.25 × Horas Extra`,
      calculation: `(${formatCurrency(employee.baseSalary)} ÷ 240) × 1.25 × ${employee.extraHours}`,
      result: formatCurrency(extraHoursPay)
    },
    {
      title: "Auxilio de Transporte",
      formula: `Si Salario Base ≤ $2,600,000 entonces $200,000`,
      calculation: `${employee.baseSalary <= 2600000 ? 'Aplica' : 'No aplica'}`,
      result: formatCurrency(transportAllowance)
    },
    {
      title: "Bonificaciones",
      formula: `Valor fijo según novedades`,
      calculation: `Bonificaciones registradas`,
      result: formatCurrency(employee.bonuses)
    },
    {
      title: "Incapacidades",
      formula: `Valor descontado según días de incapacidad`,
      calculation: `Incapacidades registradas`,
      result: formatCurrency(employee.disabilities)
    },
    {
      title: "Salud (Empleado 4%)",
      formula: `Salario Base × 4%`,
      calculation: `${formatCurrency(employee.baseSalary)} × 4%`,
      result: formatCurrency(healthContribution)
    },
    {
      title: "Pensión (Empleado 4%)",
      formula: `Salario Base × 4%`,
      calculation: `${formatCurrency(employee.baseSalary)} × 4%`,
      result: formatCurrency(pensionContribution)
    }
  ];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Detalle de Cálculos - {employee.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Base</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Salario Base</div>
                <div className="font-semibold">{formatCurrency(employee.baseSalary)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Salario Diario</div>
                <div className="font-semibold">{formatCurrency(dailySalary)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Valor Hora</div>
                <div className="font-semibold">{formatCurrency(hourlySalary)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Días Trabajados</div>
                <div className="font-semibold">{employee.workedDays}</div>
              </div>
            </CardContent>
          </Card>

          {/* Detalle de Cálculos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalle de Cálculos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calculations.map((calc, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{calc.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{calc.formula}</p>
                        <p className="text-sm text-blue-600 mt-1">{calc.calculation}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">{calc.result}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumen Final */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen Final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Devengado</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(employee.grossPay)}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">Total Deducciones</div>
                  <div className="text-2xl font-bold text-red-700">
                    {formatCurrency(employee.deductions)}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Neto a Pagar</div>
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(employee.netPay)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
