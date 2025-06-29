
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { PayrollHistoryEmployee } from '@/types/payroll-history';
import { Pencil, Plus, Minus } from 'lucide-react';
import { DevengoModal } from './DevengoModal';

interface EditableEmployeeTableProps {
  employees: PayrollHistoryEmployee[];
  isEditMode: boolean;
  onEmployeeUpdate: (employeeId: string, updates: Partial<PayrollHistoryEmployee>) => void;
  periodId: string;
  onNovedadChange: () => void;
}

export const EditableEmployeeTable = ({
  employees,
  isEditMode,
  onEmployeeUpdate,
  periodId,
  onNovedadChange
}: EditableEmployeeTableProps) => {
  const [devengoModal, setDevengoModal] = React.useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    employeeSalary: number;
    payrollId: string;
    modalType: 'devengado' | 'deduccion';
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    employeeSalary: 0,
    payrollId: '',
    modalType: 'devengado'
  });

  const handleOpenDevengoModal = (
    employee: PayrollHistoryEmployee, 
    modalType: 'devengado' | 'deduccion'
  ) => {
    console.log('🎯 Opening modal for employee:', {
      id: employee.id,
      name: employee.name,
      salary: employee.baseSalary,
      modalType
    });
    
    setDevengoModal({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeSalary: employee.baseSalary,
      payrollId: employee.payrollId || '',
      modalType
    });
  };

  const handleCloseDevengoModal = () => {
    setDevengoModal({
      isOpen: false,
      employeeId: '',
      employeeName: '',
      employeeSalary: 0,
      payrollId: '',
      modalType: 'devengado'
    });
  };

  const handleNovedadCreated = (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => {
    console.log('💰 Novedad created callback:', { employeeId, valor, tipo });
    
    // Actualizar los valores del empleado
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    let updates: Partial<PayrollHistoryEmployee> = {};
    
    if (tipo === 'devengado') {
      updates.grossPay = employee.grossPay + valor;
    } else if (tipo === 'deduccion') {
      updates.deductions = employee.deductions + valor;
    }
    
    // Recalcular neto
    const newGrossPay = updates.grossPay || employee.grossPay;
    const newDeductions = updates.deductions || employee.deductions;
    updates.netPay = newGrossPay - newDeductions;

    onEmployeeUpdate(employeeId, updates);
    onNovedadChange();
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">Empleado</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Salario Base</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Devengado</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Deducciones</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Neto</th>
              {isEditMode && <th className="border border-gray-300 px-4 py-2 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.document}</div>
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {formatCurrency(employee.baseSalary)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-green-600 font-medium">
                      {formatCurrency(employee.grossPay)}
                    </span>
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDevengoModal(employee, 'devengado')}
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-red-600 font-medium">
                      {formatCurrency(employee.deductions)}
                    </span>
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDevengoModal(employee, 'deduccion')}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <span className="font-medium">
                    {formatCurrency(employee.netPay)}
                  </span>
                </td>
                {isEditMode && (
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Devengados/Deducciones */}
      <DevengoModal
        isOpen={devengoModal.isOpen}
        onClose={handleCloseDevengoModal}
        employeeId={devengoModal.employeeId}
        employeeName={devengoModal.employeeName}
        employeeSalary={devengoModal.employeeSalary}
        payrollId={devengoModal.payrollId}
        periodId={periodId}
        modalType={devengoModal.modalType}
        onNovedadCreated={handleNovedadCreated}
      />
    </>
  );
};
