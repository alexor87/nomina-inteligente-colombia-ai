
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
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Salario Base
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Días Trab.
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Novedades
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Total a Pagar Período
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => {
                const totalToPay = calculateTotalToPay(employee);

                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.position}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(employee.baseSalary)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.workedDays}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 rounded-full p-0 border-2"
                        onClick={() => handleAddNovedades(employee.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(totalToPay)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
