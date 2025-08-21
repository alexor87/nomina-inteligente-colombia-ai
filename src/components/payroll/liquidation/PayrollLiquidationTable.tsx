
import React from 'react';
import { PayrollEmployee } from '@/types/payroll';

interface PayrollLiquidationTableProps {
  employees: PayrollEmployee[];
  startDate?: string;
  endDate?: string;
  currentPeriodId?: string;
  currentPeriod?: string;
  onRemoveEmployee?: (employeeId: string) => void;
  onEmployeeNovedadesChange?: (employeeId: string) => void;
  updateEmployeeCalculationsInDB?: (employeeId: string) => void;
  year?: string;
  onEmployeeUpdate?: (employeeId: string) => void;
}

export const PayrollLiquidationTable: React.FC<PayrollLiquidationTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  currentPeriod,
  onRemoveEmployee,
  onEmployeeNovedadesChange,
  updateEmployeeCalculationsInDB,
  year,
  onEmployeeUpdate
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Empleados en Liquidación</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-4 py-2 text-left">Empleado</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Salario Base</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Devengado</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Deducciones</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Neto</th>
              <th className="border border-gray-200 px-4 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2">
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </div>
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right">
                  ${employee.baseSalary.toLocaleString()}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right">
                  ${employee.grossPay.toLocaleString()}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right">
                  ${employee.deductions.toLocaleString()}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right font-semibold">
                  ${employee.netPay.toLocaleString()}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center">
                  <span className={`px-2 py-1 rounded text-sm ${
                    employee.status === 'valid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {employees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay empleados para mostrar
        </div>
      )}
    </div>
  );
};
