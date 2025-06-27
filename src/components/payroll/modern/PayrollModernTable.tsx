
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { User, Edit } from 'lucide-react';
import { NovedadDrawer } from '../novedades/NovedadDrawer';
import { useNovedades } from '@/hooks/useNovedades';
import { NovedadFormData, CreateNovedadData } from '@/types/novedades';

interface PayrollModernTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (id: string, updates: Partial<PayrollEmployee>) => void;
  onRecalculate: () => void;
  isLoading: boolean;
  canEdit: boolean;
  periodoId: string;
  onRefreshEmployees?: () => void;
  onDeleteEmployee?: (id: string) => void;
}

export const PayrollModernTable: React.FC<PayrollModernTableProps> = ({
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

  const handleCreateNovedad = async (data: NovedadFormData) => {
    if (!selectedEmployee) return;
    
    const createData: CreateNovedadData = {
      ...data,
      empleado_id: selectedEmployee.id,
      periodo_id: periodoId
    };
    
    await createNovedad(createData, true);
  };

  const handleUpdateNovedad = async (id: string, data: NovedadFormData) => {
    if (!selectedEmployee) return;
    await updateNovedad(id, data, selectedEmployee.id, true);
  };

  const handleDeleteNovedad = async (id: string) => {
    if (!selectedEmployee) return;
    await deleteNovedad(id, selectedEmployee.id, true);
  };

  const getEmployeeNameStyle = (status: string) => {
    switch (status) {
      case 'valid':
        return 'text-green-800';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-amber-600';
      default:
        return 'text-gray-800';
    }
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">😕</div>
        <h3 className="text-lg text-gray-600 mb-2">
          Aún no has agregado personas para liquidar
        </h3>
        <p className="text-gray-500 mb-6">
          Necesitas empleados activos para comenzar.
        </p>
        <Button 
          onClick={() => window.location.href = '/app/employees'}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Ir a Empleados
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500">
              <th className="py-3 px-4 font-medium">Empleado</th>
              <th className="py-3 px-4 font-medium text-right">Salario</th>
              <th className="py-3 px-4 font-medium text-right">Neto</th>
              <th className="py-3 px-4 font-medium text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-25">
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <div className={`font-medium ${getEmployeeNameStyle(employee.status)}`}>
                        {employee.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.position}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  {formatCurrency(employee.baseSalary)}
                </td>
                <td className="py-3 px-4 text-right font-semibold">
                  {formatCurrency(employee.netPay)}
                </td>
                <td className="py-3 px-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenNovedades(employee)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Main Action Button */}
      <div className="text-center py-8">
        <Button
          onClick={onRecalculate}
          disabled={isLoading}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
        >
          Liquidar período
        </Button>
      </div>

      {/* Novedad Drawer */}
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
