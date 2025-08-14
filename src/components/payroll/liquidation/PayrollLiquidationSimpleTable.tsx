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
import { Button } from '@/components/ui/button';
import { Calculator, Trash2 } from 'lucide-react';
import { calculateEmployeeBackend } from '@/utils/payrollCalculationsBackend';
import { PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  periodType: 'quincenal' | 'mensual';
  onEmployeeCalculated: (employee: PayrollEmployee) => void;
  onRemoveEmployee?: (employeeId: string) => void;
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  periodType,
  onEmployeeCalculated,
  onRemoveEmployee
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
               <TableCell className="font-medium">{employee.name}</TableCell>
               <TableCell className="text-muted-foreground">{employee.position}</TableCell>
               <TableCell className="text-right">{formatCurrency(employee.baseSalary || 0)}</TableCell>
               <TableCell className="text-center">{employee.workedDays || 0}</TableCell>
               <TableCell>
                 {employee.status === 'valid' ? (
                   <Badge variant="outline" className="text-green-600 border-green-600">
                     Válido
                   </Badge>
                 ) : employee.status === 'error' ? (
                   <Badge variant="destructive">
                     Error
                   </Badge>
                 ) : (
                   <Badge variant="secondary">
                     Incompleto
                   </Badge>
                 )}
               </TableCell>
               <TableCell className="text-right font-medium">
                 {formatCurrency(employee.grossPay || 0)}
               </TableCell>
               <TableCell className="text-right font-medium">
                 {formatCurrency(employee.deductions || 0)}
               </TableCell>
               <TableCell className="text-right font-semibold">
                 {formatCurrency(employee.netPay || 0)}
               </TableCell>
               <TableCell className="text-center">
                 <div className="flex items-center justify-center gap-2">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleCalculateEmployee(employee)}
                     className="h-8 px-3"
                   >
                     <Calculator className="h-4 w-4 mr-1" />
                     Calcular
                   </Button>
                   {onRemoveEmployee && (
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => onRemoveEmployee(employee.id)}
                       className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   )}
                 </div>
               </TableCell>
             </TableRow>
           ))}
        </TableBody>
      </Table>
    </div>
  );
};
