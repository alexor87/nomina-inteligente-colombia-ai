
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollEmployeeModern } from '@/types/payroll-modern';

interface PayrollEmployeeRowProps {
  employee: PayrollEmployeeModern;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (employeeId: string, data: any) => Promise<void>;
  periodId: string;
}

export const PayrollEmployeeRow: React.FC<PayrollEmployeeRowProps> = ({
  employee,
  isSelected,
  onSelect,
  onUpdate,
  periodId
}) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="p-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300"
        />
      </td>
      <td className="p-4">
        <div>
          <div className="font-medium text-gray-900">
            {employee.nombre} {employee.apellido}
          </div>
          <div className="text-sm text-gray-500">{employee.cedula}</div>
          {employee.cargo && (
            <div className="text-sm text-gray-500">{employee.cargo}</div>
          )}
        </div>
      </td>
      <td className="p-4 text-right">
        {formatCurrency(employee.salarioBase)}
      </td>
      <td className="p-4 text-right">
        {formatCurrency(employee.totalDevengos)}
      </td>
      <td className="p-4 text-right">
        {formatCurrency(employee.totalDeducciones)}
      </td>
      <td className="p-4 text-right font-medium">
        {formatCurrency(employee.totalNeto)}
      </td>
      <td className="p-4 text-center">
        <Badge variant="outline" className={
          employee.estado === 'procesada' ? 'text-green-600' : 'text-yellow-600'
        }>
          {employee.estado}
        </Badge>
      </td>
      <td className="p-4 text-center">
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};
