import React, { useState } from 'react';
import { Loader2, AlertTriangle, Users, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface EmployeeLiquidationData {
  id: string;
  employeeId: string;
  name: string;
  cedula: string;
  baseSalary: number;
  daysWorked: number;
  calculatedAmount: number;
  previousBalance: number;
  amountToPay: number;
  retefuente?: number;
}

interface EmployeeLiquidationTableProps {
  employees: EmployeeLiquidationData[];
  benefitType: 'prima' | 'cesantias' | 'intereses_cesantias';
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdateEmployee?: (employeeId: string, updates: Partial<EmployeeLiquidationData>) => void;
  onDeleteEmployee?: (employeeId: string) => void;
  editingRowId?: string | null;
  onEditRow?: (employeeId: string | null) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

const COLUMN_CONFIG: Record<string, { headers: string[]; showRetefuente: boolean }> = {
  prima: {
    headers: ['Persona', 'Base prima', 'Días trabajados', 'Valor prima', 'Saldo pendiente', 'Valor a pagar', 'Retefuente', 'Acciones'],
    showRetefuente: true,
  },
  cesantias: {
    headers: ['Persona', 'Salario promedio', 'Días', 'Valor cesantías', 'Saldo', 'Valor a pagar', 'Acciones'],
    showRetefuente: false,
  },
  intereses_cesantias: {
    headers: ['Persona', 'Base cesantías', 'Días', 'Valor intereses', 'Valor a pagar', 'Acciones'],
    showRetefuente: false,
  },
};

// Función para recalcular montos según tipo de beneficio
const recalculateAmounts = (
  employee: EmployeeLiquidationData,
  updates: Partial<EmployeeLiquidationData>,
  benefitType: string
): Partial<EmployeeLiquidationData> => {
  const baseSalary = updates.baseSalary ?? employee.baseSalary;
  const daysWorked = updates.daysWorked ?? employee.daysWorked;
  const previousBalance = updates.previousBalance ?? employee.previousBalance;
  
  let calculatedAmount = 0;
  
  if (benefitType === 'prima') {
    // Prima = (salario * días) / 360
    calculatedAmount = (baseSalary * daysWorked) / 360;
  } else if (benefitType === 'cesantias') {
    // Cesantías = (salario * días) / 360
    calculatedAmount = (baseSalary * daysWorked) / 360;
  } else if (benefitType === 'intereses_cesantias') {
    // Intereses = cesantías * 0.12 * (días / 360)
    calculatedAmount = baseSalary * 0.12 * (daysWorked / 360);
  }
  
  const amountToPay = calculatedAmount - previousBalance;
  
  return {
    ...updates,
    calculatedAmount: Math.round(calculatedAmount),
    amountToPay: Math.round(Math.max(0, amountToPay)),
  };
};

export const EmployeeLiquidationTable: React.FC<EmployeeLiquidationTableProps> = ({
  employees,
  benefitType,
  isLoading,
  error,
  onRetry,
  onUpdateEmployee,
  onDeleteEmployee,
  editingRowId,
  onEditRow,
}) => {
  const config = COLUMN_CONFIG[benefitType] || COLUMN_CONFIG.prima;
  
  // Estado local para valores editados (incluyendo calculados originales)
  const [editValues, setEditValues] = useState<Partial<EmployeeLiquidationData>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const handleStartEdit = (employee: EmployeeLiquidationData) => {
    // Guardar TODOS los valores originales, incluyendo los calculados del backend
    setEditValues({
      baseSalary: employee.baseSalary,
      daysWorked: employee.daysWorked,
      previousBalance: employee.previousBalance,
      calculatedAmount: employee.calculatedAmount,
      amountToPay: employee.amountToPay,
    });
    setHasChanges(false);
    onEditRow?.(employee.id);
  };
  
  const handleCancelEdit = () => {
    setEditValues({});
    setHasChanges(false);
    onEditRow?.(null);
  };
  
  const handleSaveEdit = (employee: EmployeeLiquidationData) => {
    // Solo recalcular si hubo cambios en campos editables
    const updatesToSave = hasChanges 
      ? recalculateAmounts(employee, editValues, benefitType)
      : {
          baseSalary: editValues.baseSalary,
          daysWorked: editValues.daysWorked,
          previousBalance: editValues.previousBalance,
          calculatedAmount: editValues.calculatedAmount,
          amountToPay: editValues.amountToPay,
        };
    onUpdateEmployee?.(employee.id, updatesToSave);
    setEditValues({});
    setHasChanges(false);
    onEditRow?.(null);
  };
  
  const handleInputChange = (field: keyof EmployeeLiquidationData, value: string, employee: EmployeeLiquidationData) => {
    const numValue = field === 'daysWorked' ? parseInt(value) || 0 : parseCurrency(value);
    
    // Marcar que hubo cambios y recalcular
    setHasChanges(true);
    const newEditValues = { ...editValues, [field]: numValue };
    const recalculated = recalculateAmounts(employee, newEditValues, benefitType);
    
    setEditValues({
      ...newEditValues,
      calculatedAmount: recalculated.calculatedAmount,
      amountToPay: recalculated.amountToPay,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Cargando empleados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No hay empleados para liquidar en este período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderEditableCell = (
    employee: EmployeeLiquidationData,
    field: keyof EmployeeLiquidationData,
    isEditing: boolean,
    isCurrency: boolean = true
  ) => {
    if (isEditing) {
      const value = editValues[field] ?? employee[field];
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value, employee)}
          className="h-8 w-24 text-right"
          min={0}
        />
      );
    }
    
    const displayValue = employee[field] as number;
    return isCurrency ? formatCurrency(displayValue) : displayValue;
  };

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {config.headers.map((header, index) => (
                    <TableHead key={index} className={index === 0 ? 'min-w-[200px]' : ''}>
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const isEditing = editingRowId === employee.id;
                  
                  // Mostrar valores editados (ya recalculados en handleInputChange) o valores originales
                  const displayEmployee = isEditing 
                    ? { ...employee, ...editValues }
                    : employee;
                  
                  return (
                    <TableRow 
                      key={employee.id} 
                      className={`hover:bg-muted/30 ${isEditing ? 'bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-200 dark:ring-blue-800' : ''}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.cedula}</p>
                        </div>
                      </TableCell>
                      
                      {/* Base salary - editable */}
                      <TableCell>
                        {renderEditableCell(employee, 'baseSalary', isEditing, true)}
                      </TableCell>
                      
                      {/* Days worked - editable */}
                      <TableCell>
                        {renderEditableCell(employee, 'daysWorked', isEditing, false)}
                      </TableCell>
                      
                      {/* Calculated amount - read only, auto-calculated */}
                      <TableCell>{formatCurrency(displayEmployee.calculatedAmount)}</TableCell>
                      
                      {/* Previous balance - editable (except for intereses) */}
                      {benefitType !== 'intereses_cesantias' && (
                        <TableCell>
                          {renderEditableCell(employee, 'previousBalance', isEditing, true)}
                        </TableCell>
                      )}
                      
                      {/* Amount to pay - read only, auto-calculated */}
                      <TableCell className="font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(displayEmployee.amountToPay)}
                      </TableCell>
                      
                      {/* Retefuente - read only */}
                      {config.showRetefuente && (
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(employee.retefuente || 0)}
                        </TableCell>
                      )}
                      
                      {/* Actions column */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleSaveEdit(employee)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Guardar cambios</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar</TooltipContent>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => handleStartEdit(employee)}
                                    disabled={!!editingRowId}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar valores</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50"
                                    onClick={() => onDeleteEmployee?.(employee.id)}
                                    disabled={!!editingRowId}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir de esta liquidación</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Summary footer */}
          <div className="border-t bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {employees.length} {employees.length === 1 ? 'empleado' : 'empleados'}
              </span>
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">Total a pagar:</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(employees.reduce((sum, e) => sum + e.amountToPay, 0))}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
