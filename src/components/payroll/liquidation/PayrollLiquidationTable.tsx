
import React from 'react';
import { PayrollEmployee } from '@/types/payroll';
import { PayrollLiquidationSimpleTable } from './PayrollLiquidationSimpleTable';

interface PayrollLiquidationTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
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
}

export const PayrollLiquidationTable: React.FC<PayrollLiquidationTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange,
  updateEmployeeCalculationsInDB
}) => {
  return (
    <PayrollLiquidationSimpleTable
      employees={employees}
      startDate={startDate}
      endDate={endDate}
      currentPeriodId={currentPeriodId}
      onRemoveEmployee={onRemoveEmployee}
      onEmployeeNovedadesChange={onEmployeeNovedadesChange}
      updateEmployeeCalculationsInDB={updateEmployeeCalculationsInDB}
    />
  );
};
