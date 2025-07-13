
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useEmployeeNovedades } from '@/hooks/useEmployeeNovedades';
import { NovedadesModal } from '@/components/payroll/modals/NovedadesModal';

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
    return basePay + novedadesTotals.totalNeto;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Empleados a Liquidar ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salario Base
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Trabajados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Novedades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total a Pagar Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => {
                  const novedadesCount = getEmployeeNovedadesCount(employee.id);
                  const novedadesTotals = getEmployeeNovedadesTotal(employee.id);
                  const totalToPay = calculateTotalToPay(employee);

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.position}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(employee.baseSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.workedDays} días
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {novedadesCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {novedadesCount} novedades
                            </Badge>
                          )}
                          {novedadesTotals.totalNeto !== 0 && (
                            <Badge 
                              variant={novedadesTotals.totalNeto > 0 ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {formatCurrency(novedadesTotals.totalNeto)}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 rounded-full p-0"
                            onClick={() => handleAddNovedades(employee.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(totalToPay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
        </CardContent>
      </Card>

      {/* Novedades Modal */}
      {showNovedadesModal && selectedEmployeeId && (
        <NovedadesModal
          isOpen={showNovedadesModal}
          onClose={handleNovedadesModalClose}
          employeeId={selectedEmployeeId}
          periodId={currentPeriodId || ''}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </>
  );
};
