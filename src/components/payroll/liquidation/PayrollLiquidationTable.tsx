
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';

export interface PayrollLiquidationTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (employeeId: string, data: any) => void;
  onRemoveEmployee: (employeeId: string) => void;
  isLoading: boolean;
}

export const PayrollLiquidationTable = ({ 
  employees, 
  onUpdateEmployee, 
  onRemoveEmployee, 
  isLoading 
}: PayrollLiquidationTableProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay empleados para mostrar
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Cédula</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead className="text-right">Salario Base</TableHead>
            <TableHead className="text-right">Días Trabajados</TableHead>
            <TableHead className="text-right">Total Devengado</TableHead>
            <TableHead className="text-right">Deducciones</TableHead>
            <TableHead className="text-right">Neto a Pagar</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">
                {employee.name}
              </TableCell>
              <TableCell>{employee.cedula}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(employee.baseSalary)}
              </TableCell>
              <TableCell className="text-right">
                {employee.effectiveWorkedDays}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(employee.grossPay)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(employee.deductions)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(employee.netPay)}
              </TableCell>
              <TableCell>
                <Badge variant={employee.status === 'valid' ? 'default' : 'destructive'}>
                  {employee.status === 'valid' ? 'Válido' : 'Error'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateEmployee(employee.id, employee)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveEmployee(employee.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
