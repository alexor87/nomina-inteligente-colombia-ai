
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit2, Save, X, User, Trash2 } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';

interface PayrollLiquidationTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
}

export const PayrollLiquidationTable: React.FC<PayrollLiquidationTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange
}) => {
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEdit = (employeeId: string, employee: PayrollEmployee) => {
    setEditingEmployee(employeeId);
    setEditValues({
      baseSalary: employee.baseSalary,
      workedDays: employee.workedDays,
      extraHours: employee.extraHours,
      bonuses: employee.bonuses
    });
  };

  const handleSave = async (employeeId: string) => {
    await onEmployeeNovedadesChange(employeeId);
    setEditingEmployee(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setEditValues({});
  };

  const updateEditValue = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditValues(prev => ({ ...prev, [field]: numValue }));
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No hay empleados para mostrar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Salario Base</TableHead>
            <TableHead>Días Trab.</TableHead>
            <TableHead>H. Extras</TableHead>
            <TableHead>Bonificaciones</TableHead>
            <TableHead>Total Devengado</TableHead>
            <TableHead>Deducciones</TableHead>
            <TableHead>Neto a Pagar</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const isEditing = editingEmployee === employee.id;
            
            return (
              <TableRow key={employee.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-gray-500">{employee.position}</p>
                  </div>
                </TableCell>
                
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editValues.baseSalary || 0}
                      onChange={(e) => updateEditValue('baseSalary', e.target.value)}
                      className="w-24"
                    />
                  ) : (
                    formatCurrency(employee.baseSalary)
                  )}
                </TableCell>
                
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editValues.workedDays || 0}
                      onChange={(e) => updateEditValue('workedDays', e.target.value)}
                      className="w-16"
                    />
                  ) : (
                    employee.workedDays
                  )}
                </TableCell>
                
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editValues.extraHours || 0}
                      onChange={(e) => updateEditValue('extraHours', e.target.value)}
                      className="w-16"
                      step="0.5"
                    />
                  ) : (
                    employee.extraHours
                  )}
                </TableCell>
                
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editValues.bonuses || 0}
                      onChange={(e) => updateEditValue('bonuses', e.target.value)}
                      className="w-24"
                    />
                  ) : (
                    formatCurrency(employee.bonuses)
                  )}
                </TableCell>
                
                <TableCell className="font-medium">
                  {formatCurrency(employee.grossPay)}
                </TableCell>
                
                <TableCell className="text-red-600">
                  {formatCurrency(employee.deductions)}
                </TableCell>
                
                <TableCell className="font-bold text-green-600">
                  {formatCurrency(employee.netPay)}
                </TableCell>
                
                <TableCell>
                  <Badge 
                    className={
                      employee.status === 'valid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {employee.status === 'valid' ? 'Válido' : 'Error'}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  {isEditing ? (
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handleSave(employee.id)}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(employee.id, employee)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
