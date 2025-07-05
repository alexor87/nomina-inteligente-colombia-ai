
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedades } from '@/hooks/usePayrollNovedades';
import { formatCurrency } from '@/lib/utils';
import { ConfigurationService } from '@/services/ConfigurationService';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onEmployeeNovedadesChange
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [novedadModalOpen, setNovedadModalOpen] = useState(false);

  const {
    loadNovedadesTotals,
    getEmployeeNovedades
  } = usePayrollNovedades(currentPeriodId || '');

  // Cargar novedades cuando se monten los empleados
  useEffect(() => {
    if (employees.length > 0 && currentPeriodId) {
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
    }
  }, [employees, currentPeriodId, loadNovedadesTotals]);

  // Calcular días trabajados basado en las fechas del período
  const calculateWorkedDays = () => {
    if (!startDate || !endDate) return 30;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(1, diffDays);
  };

  const workedDays = calculateWorkedDays();

  // Obtener configuración legal actual
  const getCurrentYearConfig = () => {
    const currentYear = new Date().getFullYear().toString();
    return ConfigurationService.getConfiguration(currentYear);
  };

  const handleOpenNovedadModal = (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setNovedadModalOpen(true);
  };

  const handleCloseNovedadModal = () => {
    setNovedadModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleNovedadSubmit = async (data: any) => {
    console.log('Novedad data submitted:', data);
    handleCloseNovedadModal();
    if (selectedEmployee) {
      await onEmployeeNovedadesChange(selectedEmployee.id);
    }
  };

  const calculateTotalToPay = (employee: PayrollEmployee) => {
    const config = getCurrentYearConfig();
    const novedades = getEmployeeNovedades(employee.id);
    
    // Salario proporcional según días trabajados
    const salarioProporcional = (employee.baseSalary / 30) * workedDays;
    
    // Base gravable: salario proporcional + novedades netas
    const baseGravable = salarioProporcional + novedades.totalNeto;
    
    // Deducciones de ley sobre base gravable (no incluir auxilio de transporte)
    const saludEmpleado = baseGravable * config.porcentajes.saludEmpleado;
    const pensionEmpleado = baseGravable * config.porcentajes.pensionEmpleado;
    const totalDeducciones = saludEmpleado + pensionEmpleado;
    
    // Auxilio de transporte proporcional (solo si salario ≤ 2 SMMLV)
    const auxilioTransporte = employee.baseSalary <= (config.salarioMinimo * 2) 
      ? (config.auxilioTransporte / 30) * workedDays 
      : 0;
    
    // Total a pagar = base gravable - deducciones + auxilio de transporte
    const totalNeto = baseGravable - totalDeducciones + auxilioTransporte;
    
    return Math.max(0, totalNeto);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre Empleado</TableHead>
            <TableHead className="text-right">Salario Base</TableHead>
            <TableHead className="text-center">Días Trabajados</TableHead>
            <TableHead className="text-center">Novedades</TableHead>
            <TableHead className="text-right">Total a Pagar Período</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const novedades = getEmployeeNovedades(employee.id);
            const totalToPay = calculateTotalToPay(employee);
            const hasNovedades = novedades.hasNovedades;

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
                
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {hasNovedades && (
                      <div className={`text-sm font-medium ${
                        novedades.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {novedades.totalNeto >= 0 ? '+' : ''}{formatCurrency(novedades.totalNeto)}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNovedadModal(employee)}
                      className="h-8 w-8 p-0 rounded-full border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                
                <TableCell className="text-right font-semibold text-lg">
                  {formatCurrency(totalToPay)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Modal de novedades */}
      {selectedEmployee && (
        <NovedadUnifiedModal
          open={novedadModalOpen}
          setOpen={setNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          periodId={currentPeriodId}
          onSubmit={handleNovedadSubmit}
          selectedNovedadType={null}
          onClose={handleCloseNovedadModal}
        />
      )}
    </>
  );
};
