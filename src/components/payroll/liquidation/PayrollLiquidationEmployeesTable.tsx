
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useEmployeeNovedades } from '@/hooks/useEmployeeNovedades';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';

interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
  workedDays: number;
  periodId: string;
}

interface PayrollLiquidationEmployeesTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | null;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => void;
}

export const PayrollLiquidationEmployeesTable: React.FC<PayrollLiquidationEmployeesTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showNovedadesModal, setShowNovedadesModal] = useState(false);

  const {
    novedades,
    getEmployeeNovedadesCount,
    getEmployeeNovedadesTotal
  } = useEmployeeNovedades(currentPeriodId || '');

  const handleAddNovedades = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowNovedadesModal(true);
  };

  const handleNovedadesModalClose = () => {
    setShowNovedadesModal(false);
    setSelectedEmployeeId(null);
    if (selectedEmployeeId) {
      onEmployeeNovedadesChange(selectedEmployeeId);
    }
  };

  const calculateTotalToPay = (employee: PayrollEmployee) => {
    const basePay = employee.baseSalary;
    const novedadesTotals = getEmployeeNovedadesTotal(employee.id);
    const totalNeto = novedadesTotals.devengos - novedadesTotals.deducciones;
    return basePay + totalNeto;
  };

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Empleados a Liquidar ({employees.length})</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Nombre Empleado
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Salario Base
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Días Trabajados
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Novedades
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Total a Pagar Período
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const totalToPay = calculateTotalToPay(employee);

                return (
                  <tr key={employee.id} className="border-b border-gray-100">
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.position}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatCurrency(employee.baseSalary)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {employee.workedDays}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleAddNovedades(employee.id)}
                        className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(totalToPay)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Novedades Modal */}
      {showNovedadesModal && selectedEmployeeId && (
        <NovedadUnifiedModal
          open={showNovedadesModal}
          setOpen={setShowNovedadesModal}
          employeeId={selectedEmployeeId}
          employeeSalary={employees.find(emp => emp.id === selectedEmployeeId)?.baseSalary}
          periodId={currentPeriodId || ''}
          onSubmit={async (data) => {
            // Handle novedad submission
            console.log('Novedad submitted:', data);
          }}
          onClose={handleNovedadesModalClose}
          selectedNovedadType={null}
          onEmployeeNovedadesChange={async (employeeId: string) => {
            onEmployeeNovedadesChange(employeeId);
          }}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </>
  );
};
