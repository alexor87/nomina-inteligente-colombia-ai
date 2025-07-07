
import React from 'react';
import { PayrollEmployee } from '@/types/payroll';
import { PayrollModernTable } from '../modern/PayrollModernTable';

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
  // Create a mock period for PayrollModernTable compatibility
  const period = {
    id: currentPeriodId || '',
    fecha_inicio: startDate,
    fecha_fin: endDate,
    tipo_periodo: 'mensual' as const
  };

  const handleUpdateEmployee = (id: string, updates: Partial<PayrollEmployee>) => {
    // This will be handled by the parent component's auto-save mechanism
    console.log('Employee update requested:', id, updates);
  };

  const handleRecalculate = async () => {
    // Trigger recalculation for all employees
    console.log('Recalculation requested');
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    await onRemoveEmployee(employeeId);
  };

  const handleRefreshEmployees = async () => {
    // This will be handled by the parent component
    console.log('Employee refresh requested');
  };

  return (
    <PayrollModernTable
      employees={employees}
      onUpdateEmployee={handleUpdateEmployee}
      onRecalculate={handleRecalculate}
      isLoading={false}
      canEdit={true}
      periodoId={currentPeriodId || ''}
      onRefreshEmployees={handleRefreshEmployees}
      onDeleteEmployee={handleDeleteEmployee}
      onEmployeeNovedadesChange={onEmployeeNovedadesChange}
    />
  );
};
