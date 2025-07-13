
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollEmployee } from '@/types/payroll';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { ConfigurationService } from '@/services/ConfigurationService';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';
import { EmployeeRow } from './EmployeeRow';
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
  onRemoveEmployee?: (employeeId: string) => void;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onEmployeeNovedadesChange,
  onRemoveEmployee
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [novedadModalOpen, setNovedadModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<PayrollEmployee | null>(null);
  const { toast } = useToast();

  const {
    loadNovedadesTotals,
    createNovedad,
    getEmployeeNovedades,
    isCreating
  } = usePayrollNovedadesUnified(currentPeriodId || '');

  // Load novedades when employees mount or period changes
  useEffect(() => {
    if (employees.length > 0 && currentPeriodId) {
      console.log('📊 Cargando novedades para empleados, período:', currentPeriodId);
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
    }
  }, [employees, currentPeriodId, loadNovedadesTotals]);

  const calculateWorkedDays = () => {
    if (!startDate || !endDate) return 30;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(1, diffDays);
  };

  const workedDays = calculateWorkedDays();

  const getCurrentYearConfig = () => {
    const currentYear = new Date().getFullYear().toString();
    return ConfigurationService.getConfiguration(currentYear);
  };

  const handleOpenNovedadModal = (employee: PayrollEmployee) => {
    console.log('📝 Abriendo modal de novedades para:', employee.name);
    console.log('📅 Fecha del período:', startDate);
    setSelectedEmployee(employee);
    setNovedadModalOpen(true);
  };

  const handleCloseNovedadModal = async () => {
    if (selectedEmployee) {
      console.log('🔄 Sincronización final al cerrar modal para:', selectedEmployee.name);
      await onEmployeeNovedadesChange(selectedEmployee.id);
    }
    setNovedadModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleNovedadSubmit = async (data: CreateNovedadData) => {
    if (!selectedEmployee || !currentPeriodId) {
      console.warn('⚠️ Faltan datos necesarios para crear novedad');
      return;
    }

    console.log('💾 Creando novedad:', data);
    
    try {
      const result = await createNovedad({
        ...data,
        empleado_id: selectedEmployee.id,
        periodo_id: currentPeriodId
      });
      
      if (result) {
        handleCloseNovedadModal();
        console.log('✅ Novedad creada y sincronizada exitosamente');
      }
    } catch (error) {
      console.error('❌ Error en creación de novedad:', error);
    }
  };

  const handleNovedadChange = async (employeeId: string) => {
    console.log('🔄 Novedad modificada para empleado:', employeeId);
    await onEmployeeNovedadesChange(employeeId);
  };

  const handleDeleteEmployee = (employee: PayrollEmployee) => {
    setEmployeeToDelete(employee);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete && onRemoveEmployee) {
      onRemoveEmployee(employeeToDelete.id);
      toast({
        title: "✅ Empleado removido",
        description: `${employeeToDelete.name} ha sido removido de esta liquidación`,
        className: "border-orange-200 bg-orange-50"
      });
      setEmployeeToDelete(null);
    }
  };

  const cancelDeleteEmployee = () => {
    setEmployeeToDelete(null);
  };

  const calculateTotalToPay = (employee: PayrollEmployee) => {
    const config = getCurrentYearConfig();
    const novedades = getEmployeeNovedades(employee.id);
    
    // Proportional salary according to worked days
    const salarioProporcional = (employee.baseSalary / 30) * workedDays;
    
    // Taxable base: proportional salary + net novedades
    const baseGravable = salarioProporcional + novedades.totalNeto;
    
    // Legal deductions on taxable base
    const saludEmpleado = baseGravable * config.porcentajes.saludEmpleado;
    const pensionEmpleado = baseGravable * config.porcentajes.pensionEmpleado;
    const totalDeducciones = saludEmpleado + pensionEmpleado;
    
    // Proportional transportation allowance (only if salary ≤ 2 SMMLV)
    const auxilioTransporte = employee.baseSalary <= (config.salarioMinimo * 2) 
      ? (config.auxilioTransporte / 30) * workedDays 
      : 0;
    
    // Total to pay = taxable base - deductions + transportation allowance
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
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const novedades = getEmployeeNovedades(employee.id);
            const totalToPay = calculateTotalToPay(employee);

            return (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                workedDays={workedDays}
                novedades={novedades}
                totalToPay={totalToPay}
                isCreating={isCreating}
                onOpenNovedadModal={handleOpenNovedadModal}
                onRemoveEmployee={onRemoveEmployee ? handleDeleteEmployee : undefined}
              />
            );
          })}
        </TableBody>
      </Table>

      {/* Modal de novedades */}
      {selectedEmployee && currentPeriodId && (
        <NovedadUnifiedModal
          open={novedadModalOpen}
          setOpen={setNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          periodId={currentPeriodId}
          onSubmit={handleNovedadSubmit}
          selectedNovedadType={null}
          onClose={handleCloseNovedadModal}
          onEmployeeNovedadesChange={handleNovedadChange}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      {/* Confirmation Dialog for Delete */}
      <DeleteEmployeeDialog
        employee={employeeToDelete}
        isOpen={!!employeeToDelete}
        onConfirm={confirmDeleteEmployee}
        onCancel={cancelDeleteEmployee}
      />
    </>
  );
};
