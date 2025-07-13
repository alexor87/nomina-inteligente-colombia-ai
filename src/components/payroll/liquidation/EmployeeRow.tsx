
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { NovedadesTotals } from '@/services/NovedadesCalculationService';
import { formatCurrency } from '@/lib/utils';
import { NovedadesCell } from './NovedadesCell';

interface EmployeeRowProps {
  employee: PayrollEmployee;
  workedDays: number;
  novedades: NovedadesTotals;
  totalToPay: number;
  isCreating: boolean;
  onOpenNovedadModal: (employee: PayrollEmployee) => void;
  onRemoveEmployee?: (employee: PayrollEmployee) => void;
}

export const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  workedDays,
  novedades,
  totalToPay,
  isCreating,
  onOpenNovedadModal,
  onRemoveEmployee
}) => {
  return (
    <TableRow key={employee.id}>
      <TableCell>
        <div className="font-medium">{employee.name}</div>
        <div className="text-sm text-gray-500">{employee.position}</div>
      </TableCell>
      
      <TableCell className="text-right font-medium">
        {formatCurrency(employee.baseSalary)}
      </TableCell>
      
      <TableCell className="text-center font-medium">
        {workedDays} días
      </TableCell>
      
      <NovedadesCell
        novedades={novedades}
        isCreating={isCreating}
        onOpenModal={() => onOpenNovedadModal(employee)}
      />
      
      <TableCell className="text-right font-semibold text-lg">
        {formatCurrency(totalToPay)}
      </TableCell>

      <TableCell className="text-center">
        {onRemoveEmployee && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemoveEmployee(employee)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};
