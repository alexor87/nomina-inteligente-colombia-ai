
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  devengos: number;
  deducciones: number;
  total_pagar: number;
  dias_trabajados: number;
}

interface PayrollLiquidationTableProps {
  employees: Employee[];
  startDate: string;
  endDate: string;
  onRemoveEmployee: (employeeId: string) => void;
}

export const PayrollLiquidationTable = ({ 
  employees, 
  startDate, 
  endDate, 
  onRemoveEmployee 
}: PayrollLiquidationTableProps) => {
  const totalPagar = employees.reduce((sum, emp) => sum + emp.total_pagar, 0);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Empleado</th>
              <th className="text-right p-4">Salario Base</th>
              <th className="text-right p-4">Días</th>
              <th className="text-right p-4">Salario Proporcional</th>
              <th className="text-right p-4">Devengos</th>
              <th className="text-right p-4">Deducciones</th>
              <th className="text-right p-4">Total a Pagar</th>
              <th className="text-center p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
              
              return (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{employee.nombre} {employee.apellido}</div>
                    </div>
                  </td>
                  <td className="p-4 text-right">{formatCurrency(employee.salario_base)}</td>
                  <td className="p-4 text-right">{employee.dias_trabajados}</td>
                  <td className="p-4 text-right">{formatCurrency(salarioProporcional)}</td>
                  <td className="p-4 text-right">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      +{formatCurrency(employee.devengos)}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      -{formatCurrency(employee.deducciones)}
                    </Badge>
                  </td>
                  <td className="p-4 text-right font-bold">
                    {formatCurrency(employee.total_pagar)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-gray-50">
              <td colSpan={6} className="p-4 text-right font-bold">Total General:</td>
              <td className="p-4 text-right font-bold text-lg">
                {formatCurrency(totalPagar)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};
