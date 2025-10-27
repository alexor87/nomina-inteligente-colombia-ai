
import React from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { Calculator, X, Info } from 'lucide-react';

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

  // ⚠️ ELIMINADOS TODOS LOS CÁLCULOS FRONTEND
  // Todos los valores vienen precalculados del backend
  const calculations = [
    {
      title: "Salario Base",
      formula: `Salario mensual configurado`,
      calculation: `Valor base del empleado`,
      result: formatCurrency(employee.baseSalary),
      note: "📊 Calculado en backend"
    },
    {
      title: "Días Trabajados",
      formula: `Días efectivamente laborados`,
      calculation: `${employee.workedDays} días`,
      result: `${employee.workedDays} días`,
      note: "⚡ Valor configurado"
    },
    {
      title: "Horas Extra",
      formula: `Calculadas con jornada legal dinámica`,
      calculation: `${employee.extraHours || 0} horas`,
      result: formatCurrency(0), // Se muestra en grossPay
      note: "🔄 Calculado en backend con divisor correcto"
    },
    {
      title: "Auxilio de Transporte / Conectividad",
      formula: `Según legislación vigente`,
      calculation: `Calculado automáticamente`,
      result: formatCurrency(employee.transportAllowance || 0),
      note: "⚖️ Proporcional a días trabajados"
    },
    {
      title: "Total Devengado",
      formula: `Suma de todos los conceptos positivos`,
      calculation: `Incluye salario + horas extra + bonificaciones + auxilio`,
      result: formatCurrency(employee.grossPay),
      note: "✅ Valor final calculado en backend"
    },
    {
      title: "Deducciones Totales",
      formula: `Salud + Pensión + Otras deducciones`,
      calculation: `Calculado sobre base gravable`,
      result: formatCurrency(employee.deductions),
      note: "📉 Incluye todas las deducciones legales"
    }
  ];

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Detalle de Cálculos - {employee.name}
        </CustomModalTitle>
      </CustomModalHeader>

      <div className="space-y-4">
        {/* Alerta de Backend */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 text-blue-700">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Cálculos realizados en el backend</p>
                <p className="mt-1">Todos los valores mostrados son calculados automáticamente por el sistema utilizando la legislación laboral vigente y jornada legal dinámica.</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <div className="text-sm text-gray-600">Días Trabajados</div>
              <div className="font-semibold">{employee.workedDays}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Horas Extra</div>
              <div className="font-semibold">{employee.extraHours || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Estado</div>
              <div className="font-semibold text-green-600">Calculado</div>
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
                      <p className="text-xs text-green-600 mt-1 italic">{calc.note}</p>
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
                <div className="text-xs text-blue-600 mt-1">Calculado en backend</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Total Deducciones</div>
                <div className="text-2xl font-bold text-red-700">
                  {formatCurrency(employee.deductions)}
                </div>
                <div className="text-xs text-red-600 mt-1">Incluye todas las deducciones</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Neto a Pagar</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(employee.netPay)}
                </div>
                <div className="text-xs text-green-600 mt-1">Valor final</div>
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
    </CustomModal>
  );
};
