
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { Edit, UserPlus } from 'lucide-react';
import { NovedadDrawer } from '@/components/payroll/novedades/NovedadDrawer';
import { useNovedades } from '@/hooks/useNovedades';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';

interface PayrollTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (id: string, updates: Partial<PayrollEmployee>) => void;
  onRecalculate: () => void;
  isLoading: boolean;
  canEdit: boolean;
  periodoId: string;
  onRefreshEmployees?: () => void;
  onDeleteEmployee?: (id: string) => void;
  onDeleteMultipleEmployees?: (employeeIds: string[]) => Promise<void>;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
  employees,
  onUpdateEmployee,
  onRecalculate,
  isLoading,
  canEdit,
  periodoId,
  onRefreshEmployees,
  onDeleteEmployee
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    loadNovedadesForEmployee,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    getEmployeeNovedades,
    isLoading: novedadesLoading
  } = useNovedades(periodoId);

  const handleOpenNovedades = async (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    await loadNovedadesForEmployee(employee.id);
    setIsDrawerOpen(true);
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    const createData: CreateNovedadData = {
      empleado_id: selectedEmployee.id,
      periodo_id: periodoId,
      ...data
    };
    
    await createNovedad(createData, true);
  };

  const handleUpdateNovedad = async (id: string, data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    await updateNovedad(id, data, selectedEmployee.id, true);
  };

  const handleDeleteNovedad = async (id: string) => {
    if (!selectedEmployee) return;
    await deleteNovedad(id, selectedEmployee.id, true);
  };

  // Estado vacío siguiendo exactamente el ejemplo de Aleluya
  if (employees.length === 0) {
    return (
      <div className="bg-white min-h-96">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <UserPlus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No has agregado personas
          </h3>
          <p className="text-gray-500 mb-8 text-center max-w-md">
            Para liquidar tu primera nómina debes agregar al menos una persona
          </p>
          <Button 
            onClick={() => window.location.href = '/app/employees'}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Agregar persona
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white">
        <div className="max-w-7xl mx-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">
                  Personas
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-700">
                  Salario base
                </th>
                <th className="text-center py-4 px-6 text-sm font-medium text-gray-700">
                  Novedades
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-700">
                  Total pago empleado
                </th>
                <th className="text-center py-4 px-6 text-sm font-medium text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => (
                <tr key={employee.id} className={index !== employees.length - 1 ? "border-b border-gray-100" : ""}>
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900">
                        {employee.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.position}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-medium text-gray-900">
                    {formatCurrency(employee.baseSalary)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Ver novedades
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-semibold text-gray-900">
                    {formatCurrency(employee.netPay)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenNovedades(employee)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <NovedadDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedEmployee(null);
          }}
          employeeName={selectedEmployee.name}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          novedades={getEmployeeNovedades(selectedEmployee.id)}
          onCreateNovedad={handleCreateNovedad}
          onUpdateNovedad={handleUpdateNovedad}
          onDeleteNovedad={handleDeleteNovedad}
          isLoading={novedadesLoading}
          canEdit={canEdit}
          onRecalculatePayroll={onRecalculate}
        />
      )}
    </>
  );
};
