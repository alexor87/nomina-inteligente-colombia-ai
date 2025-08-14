import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PayrollEmployee } from '@/types/payroll';
import { Badge } from '@/components/ui/badge';
import { calculateEmployeeBackend } from '@/utils/payrollCalculationsBackend';
import { PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  periodType: 'quincenal' | 'mensual';
  onEmployeeCalculated: (employee: PayrollEmployee) => void;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  periodType,
  onEmployeeCalculated
}) => {

  const handleCalculateEmployee = async (employee: PayrollEmployee) => {
    try {
      const calculatedEmployee = await calculateEmployeeBackend(employee, periodType);
      onEmployeeCalculated(calculatedEmployee);
    } catch (error) {
      console.error('Error calculating employee:', error);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Salario Base</TableHead>
            <TableHead>Días Trabajados</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Devengado</TableHead>
            <TableHead className="text-right">Deducciones</TableHead>
            <TableHead className="text-right">Neto a Pagar</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.id}</TableCell>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell>{employee.baseSalary}</TableCell>
              <TableCell>{employee.workedDays}</TableCell>
              <TableCell>
                {employee.status === 'valid' ? (
                  <Badge variant="outline">Valid</Badge>
                ) : (
                  <Badge variant="destructive">Error</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{employee.grossPay}</TableCell>
              <TableCell className="text-right">{employee.deductions}</TableCell>
              <TableCell className="text-right">{employee.netPay}</TableCell>
              <TableCell className="text-center">
                <button onClick={() => handleCalculateEmployee(employee)}>
                  Calcular
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
