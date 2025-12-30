import React from 'react';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const COLUMN_CONFIG: Record<string, { headers: string[]; showRetefuente: boolean }> = {
  prima: {
    headers: ['Persona', 'Base prima', 'Días trabajados', 'Valor prima', 'Saldo pendiente', 'Valor a pagar', 'Retefuente'],
    showRetefuente: true,
  },
  cesantias: {
    headers: ['Persona', 'Salario promedio', 'Días', 'Valor cesantías', 'Saldo', 'Valor a pagar'],
    showRetefuente: false,
  },
  intereses_cesantias: {
    headers: ['Persona', 'Base cesantías', 'Días', 'Valor intereses', 'Valor a pagar'],
    showRetefuente: false,
  },
};

export const EmployeeLiquidationTable: React.FC<EmployeeLiquidationTableProps> = ({
  employees,
  benefitType,
  isLoading,
  error,
  onRetry,
}) => {
  const config = COLUMN_CONFIG[benefitType] || COLUMN_CONFIG.prima;

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

  return (
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
              {employees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.cedula}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(employee.baseSalary)}</TableCell>
                  <TableCell>{employee.daysWorked}</TableCell>
                  <TableCell>{formatCurrency(employee.calculatedAmount)}</TableCell>
                  {benefitType !== 'intereses_cesantias' && (
                    <TableCell>{formatCurrency(employee.previousBalance)}</TableCell>
                  )}
                  <TableCell className="font-semibold text-green-700 dark:text-green-400">
                    {formatCurrency(employee.amountToPay)}
                  </TableCell>
                  {config.showRetefuente && (
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(employee.retefuente || 0)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
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
  );
};
