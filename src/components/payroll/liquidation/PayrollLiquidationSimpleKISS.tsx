
/**
 * ✅ TABLA SIMPLE DE LIQUIDACIÓN - PRINCIPIO KISS
 * Una sola responsabilidad: mostrar cálculos de nómina
 */

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { usePayrollCalculationKISS } from '@/hooks/usePayrollCalculationKISS';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { IBCDisplayKISS } from '@/components/payroll/IBCDisplayKISS';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PayrollLiquidationSimpleKISSProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onRemoveEmployee: (employeeId: string) => void;
  year: string;
}

export const PayrollLiquidationSimpleKISS: React.FC<PayrollLiquidationSimpleKISSProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  year
}) => {
  const { calculate } = usePayrollCalculationKISS();
  const { getEmployeeNovedades } = usePayrollNovedadesUnified(currentPeriodId || '');
  
  const [calculatedEmployees, setCalculatedEmployees] = useState<Array<PayrollEmployee & {
    calculationResult?: any;
  }>>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Calcular nómina para todos los empleados
  useEffect(() => {
    if (!employees.length || !currentPeriodId) return;

    const calculatedResults = employees.map(employee => {
      // Obtener novedades del empleado
      const novedadesTotals = getEmployeeNovedades(employee.id);
      
      // Convertir a formato esperado por el servicio
      const novedades = employee.novedades?.map(n => ({
        tipo_novedad: n.tipo_novedad || 'otros',
        valor: Number(n.valor || 0),
        constitutivo_salario: n.constitutivo_salario || false
      })) || [];

      // Calcular días trabajados (15 para quincenal, 30 para mensual)
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const daysDiff = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const diasTrabajados = Math.min(daysDiff, 30); // Máximo 30 días

      // Usar el servicio KISS
      const calculationResult = calculate({
        salarioBase: employee.baseSalary,
        diasTrabajados,
        novedades,
        year
      });

      return {
        ...employee,
        // Actualizar valores calculados
        grossPay: calculationResult.totalDevengado,
        deductions: calculationResult.totalDeducciones,
        netPay: calculationResult.netoPagar,
        ibc: calculationResult.ibc,
        healthDeduction: calculationResult.saludEmpleado,
        pensionDeduction: calculationResult.pensionEmpleado,
        transportAllowance: calculationResult.auxilioTransporte,
        calculationResult
      };
    });

    setCalculatedEmployees(calculatedResults);
  }, [employees, calculate, getEmployeeNovedades, currentPeriodId, startDate, endDate, year]);

  const selectedEmployeeData = calculatedEmployees.find(emp => emp.id === selectedEmployee);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-right">Salario Base</TableHead>
              <TableHead className="text-right">IBC</TableHead>
              <TableHead className="text-right">Devengado</TableHead>
              <TableHead className="text-right">Deducciones</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-center">Novedades</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calculatedEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  ${employee.baseSalary.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium">${employee.ibc?.toLocaleString() || '0'}</span>
                    {employee.calculationResult?.aplicoLimitesIBC && (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        Límites
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${employee.grossPay.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ${employee.deductions.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  ${employee.netPay.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {employee.novedades?.length || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEmployee(employee.id)}
                    >
                      <Eye className="h-4 w-4" />
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

      {/* Modal de detalles */}
      {selectedEmployeeData && (
        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles de Cálculo - {selectedEmployeeData.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedEmployeeData.calculationResult && (
                <IBCDisplayKISS
                  ibc={selectedEmployeeData.calculationResult.ibc}
                  salarioBase={selectedEmployeeData.calculationResult.salarioProporcional}
                  novedadesConstitutivas={selectedEmployeeData.calculationResult.detallesIBC?.sumaNovedadesConstitutivas || 0}
                  aplicoLimites={selectedEmployeeData.calculationResult.aplicoLimitesIBC}
                  detalles={selectedEmployeeData.calculationResult.detallesIBC}
                />
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Devengado:</strong> ${selectedEmployeeData.grossPay.toLocaleString()}
                </div>
                <div>
                  <strong>Salud (4%):</strong> ${selectedEmployeeData.healthDeduction?.toLocaleString() || '0'}
                </div>
                <div>
                  <strong>Pensión (4%):</strong> ${selectedEmployeeData.pensionDeduction?.toLocaleString() || '0'}
                </div>
                <div>
                  <strong>Auxilio Transporte:</strong> ${selectedEmployeeData.transportAllowance?.toLocaleString() || '0'}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
