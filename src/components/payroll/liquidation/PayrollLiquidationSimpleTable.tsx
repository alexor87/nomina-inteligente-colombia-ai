
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Calculator, Trash2, FileText } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { EmployeeLiquidationModal } from '../modals/EmployeeLiquidationModal';
import { EmployeeCalculationModal } from '../modals/EmployeeCalculationModal';
import { NovedadUnifiedModal } from '../novedades/NovedadUnifiedModal';
import { LegalInfoTooltip } from '../LegalInfoTooltip';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  currentPeriod?: { tipo_periodo?: string } | null;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
  updateEmployeeCalculationsInDB?: (calculations: Record<string, {
    totalToPay: number; 
    ibc: number; 
    grossPay?: number; 
    deductions?: number; 
    healthDeduction?: number; 
    pensionDeduction?: number; 
    transportAllowance?: number; 
  }>) => Promise<void>;
  year: string;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  currentPeriod,
  onRemoveEmployee,
  onEmployeeNovedadesChange,
  updateEmployeeCalculationsInDB,
  year
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showNovedadModal, setShowNovedadModal] = useState(false);

  // ✅ CÁLCULO CORRECTO DE TOTALES usando valores del backend
  const totals = useMemo(() => {
    return employees.reduce((acc, emp) => ({
      totalEmployees: acc.totalEmployees + 1,
      totalGrossPay: acc.totalGrossPay + (emp.grossPay || 0),
      totalDeductions: acc.totalDeductions + (emp.deductions || 0),
      totalNetPay: acc.totalNetPay + (emp.netPay || 0), // ✅ Usar netPay del backend
      totalTransportAllowance: acc.totalTransportAllowance + (emp.transportAllowance || 0),
      totalIBC: acc.totalIBC + (emp.ibc || 0)
    }), {
      totalEmployees: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      totalTransportAllowance: 0,
      totalIBC: 0
    });
  }, [employees]);

  const handleViewCalculation = (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setShowCalculationModal(true);
  };

  const handleViewLiquidation = (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setShowLiquidationModal(true);
  };

  const handleViewNovedades = (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setShowNovedadModal(true);
  };

  const handleNovedadChange = async () => {
    if (selectedEmployee) {
      await onEmployeeNovedadesChange(selectedEmployee.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabla de empleados */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Empleado</TableHead>
              <TableHead className="text-center font-semibold">Cargo</TableHead>
              <TableHead className="text-center font-semibold">Salario Base</TableHead>
              <TableHead className="text-center font-semibold">
                Días Efectivos
                <LegalInfoTooltip type="incapacity" />
              </TableHead>
              <TableHead className="text-center font-semibold">Total Devengado</TableHead>
              <TableHead className="text-center font-semibold">
                Aux. Transporte
                <LegalInfoTooltip type="transport" />
              </TableHead>
              <TableHead className="text-center font-semibold">Novedades</TableHead>
              <TableHead className="text-center font-semibold">Total Deducciones</TableHead>
              <TableHead className="text-center font-semibold">
                Neto a Pagar
                <LegalInfoTooltip type="net_pay" />
              </TableHead>
              <TableHead className="text-center font-semibold">Estado</TableHead>
              <TableHead className="text-center font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              // ✅ MOSTRAR DÍAS EFECTIVOS (corregido desde el backend)
              const effectiveWorkedDays = employee.effectiveWorkedDays || employee.workedDays;
              const hasIncapacity = (employee.incapacityDays || 0) > 0;
              
              return (
                <TableRow key={employee.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div>
                      <div>{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.eps} | {employee.afp}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{employee.position}</TableCell>
                  <TableCell className="text-center font-mono">
                    {formatCurrency(employee.baseSalary)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={hasIncapacity ? 'text-orange-600 font-semibold' : ''}>
                        {effectiveWorkedDays}
                      </span>
                      {hasIncapacity && (
                        <span className="text-xs text-red-500">
                          ({employee.incapacityDays} inc.)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {formatCurrency(employee.grossPay)}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    <span className={employee.transportAllowance > 0 ? 'text-green-600' : 'text-gray-400'}>
                      {formatCurrency(employee.transportAllowance || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewNovedades(employee)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                  <TableCell className="text-center font-mono text-red-600">
                    {formatCurrency(employee.deductions)}
                  </TableCell>
                  <TableCell className="text-center">
                    {/* ✅ MOSTRAR NETO CORRECTO DEL BACKEND */}
                    <div className="font-mono font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                      {formatCurrency(employee.netPay)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={employee.status === 'valid' ? 'default' : 'destructive'}
                      className={employee.status === 'valid' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {employee.status === 'valid' ? 'Válido' : 'Error'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1 justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCalculation(employee)}
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                        title="Ver cálculos"
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLiquidation(employee)}
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-100"
                        title="Editar liquidación"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                        title="Remover empleado"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Totales */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Empleados</div>
            <div className="text-xl font-bold text-gray-900">{totals.totalEmployees}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Devengado</div>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(totals.totalGrossPay)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Aux. Transporte</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totals.totalTransportAllowance)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Deducciones</div>
            <div className="text-xl font-bold text-red-600">{formatCurrency(totals.totalDeductions)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">
              Neto Total a Pagar
              <LegalInfoTooltip type="net_pay" />
            </div>
            {/* ✅ TOTAL NETO CORRECTO */}
            <div className="text-2xl font-bold text-green-700 bg-green-100 px-3 py-1 rounded-lg">
              {formatCurrency(totals.totalNetPay)}
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {selectedEmployee && (
        <>
          <EmployeeLiquidationModal
            isOpen={showLiquidationModal}
            onClose={() => setShowLiquidationModal(false)}
            employee={selectedEmployee}
            periodId={currentPeriodId || ''}
          />
          
          <EmployeeCalculationModal
            isOpen={showCalculationModal}
            onClose={() => setShowCalculationModal(false)}
            employee={selectedEmployee}
          />

          <NovedadUnifiedModal
            isOpen={showNovedadModal}
            onClose={() => setShowNovedadModal(false)}
            employeeId={selectedEmployee.id}
            employeeName={selectedEmployee.name}
            periodId={currentPeriodId}
            startDate={startDate}
            endDate={endDate}
            onNovedadChange={handleNovedadChange}
            year={year}
          />
        </>
      )}
    </div>
  );
};
