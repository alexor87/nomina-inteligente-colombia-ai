
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { AlertCircle, CheckCircle, Clock, Lock, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PayrollTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (id: string, field: string, value: number) => void;
  isLoading: boolean;
  canEdit?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = {
  valid: { 
    label: 'Válido', 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircle 
  },
  error: { 
    label: 'Error', 
    color: 'bg-red-100 text-red-800', 
    icon: AlertCircle 
  },
  incomplete: { 
    label: 'Incompleto', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: Clock 
  }
};

export const PayrollTable = ({ employees, onUpdateEmployee, isLoading, canEdit = true }: PayrollTableProps) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const handleCellEdit = (employeeId: string, field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    onUpdateEmployee(employeeId, field, numericValue);
    setEditingCell(null);
  };

  const handleCellClick = (cellId: string) => {
    if (canEdit) {
      setEditingCell(cellId);
    }
  };

  const EditableCell = ({ 
    employeeId, 
    field, 
    value, 
    className = "" 
  }: { 
    employeeId: string; 
    field: string; 
    value: number; 
    className?: string; 
  }) => {
    const cellId = `${employeeId}-${field}`;
    const isEditing = editingCell === cellId;

    if (isEditing) {
      return (
        <Input
          type="number"
          defaultValue={value}
          className="h-8 text-sm"
          autoFocus
          onBlur={(e) => handleCellEdit(employeeId, field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCellEdit(employeeId, field, e.currentTarget.value);
            }
            if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
        />
      );
    }

    return (
      <div 
        className={`cursor-pointer hover:bg-gray-50 p-1 rounded ${className} ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
        onClick={() => handleCellClick(cellId)}
      >
        {typeof value === 'number' ? formatCurrency(value) : value}
      </div>
    );
  };

  if (employees.length === 0) {
    return (
      <Card className="mx-6 p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">Sin empleados para liquidar</h3>
            <p className="text-gray-500 max-w-md">
              No hay empleados activos disponibles para la liquidación de nómina. 
              Primero debes agregar empleados en el módulo de Empleados.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/empleados'}
            className="mt-4"
          >
            <Users className="h-4 w-4 mr-2" />
            Ir a Empleados
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-6 flex-1 overflow-hidden">
      <Card className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Empleados para Liquidación</h2>
          <div className="flex items-center space-x-2">
            {!canEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      <Lock className="h-3 w-3 mr-1" />
                      Solo lectura
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>El período no está en estado borrador. Los valores no se pueden editar.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Badge variant="secondary">
              {employees.length} empleados
            </Badge>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-48">Empleado</TableHead>
                <TableHead className="w-32">Cargo</TableHead>
                <TableHead className="w-32 text-right">Salario Base</TableHead>
                <TableHead className="w-24 text-center">Días</TableHead>
                <TableHead className="w-24 text-center">H. Extra</TableHead>
                <TableHead className="w-32 text-right">Bonos</TableHead>
                <TableHead className="w-32 text-right">Devengado</TableHead>
                <TableHead className="w-32 text-right">Deducciones</TableHead>
                <TableHead className="w-32 text-right">Neto</TableHead>
                <TableHead className="w-24 text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const config = statusConfig[employee.status];
                const StatusIcon = config.icon;
                
                return (
                  <TableRow key={employee.id} className={isLoading ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{employee.name}</div>
                        <div className="text-xs text-gray-500">{employee.id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {employee.position}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        employeeId={employee.id}
                        field="baseSalary"
                        value={employee.baseSalary}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <EditableCell
                        employeeId={employee.id}
                        field="workedDays"
                        value={employee.workedDays}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <EditableCell
                        employeeId={employee.id}
                        field="extraHours"
                        value={employee.extraHours}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        employeeId={employee.id}
                        field="bonuses"
                        value={employee.bonuses}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(employee.grossPay)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(employee.deductions)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(employee.netPay)}
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={`${config.color} flex items-center space-x-1`}>
                              <StatusIcon className="h-3 w-3" />
                              <span className="text-xs">{config.label}</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {employee.errors.length > 0 ? (
                              <div>
                                <p className="font-medium">Errores:</p>
                                <ul className="list-disc list-inside">
                                  {employee.errors.map((error, index) => (
                                    <li key={index} className="text-xs">{error}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p>Empleado válido para liquidación</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
