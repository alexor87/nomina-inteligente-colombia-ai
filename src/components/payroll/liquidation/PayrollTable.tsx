
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { Plus, UserPlus, Edit } from 'lucide-react';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { useNovedades } from '@/hooks/useNovedades';
import { usePayrollNovedades } from '@/hooks/usePayrollNovedades';
import { CreateNovedadData } from '@/types/novedades-enhanced';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    createNovedad,
    isLoading: novedadesLoading
  } = useNovedades(periodoId);

  const {
    loadNovedadesTotals,
    refreshEmployeeNovedades,
    getEmployeeNovedades
  } = usePayrollNovedades(periodoId);

  // Cargar novedades al montar el componente y cuando cambien los empleados
  useEffect(() => {
    if (employees.length > 0) {
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
    }
  }, [employees, loadNovedadesTotals]);

  const handleOpenNovedades = (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    const createData: CreateNovedadData = {
      empleado_id: selectedEmployee.id,
      periodo_id: periodoId,
      ...data
    };
    
    await createNovedad(createData, true);
    
    // Actualizar novedades para este empleado específico
    await refreshEmployeeNovedades(selectedEmployee.id);
    
    // Trigger recalculation
    onRecalculate();
  };

  const calculateSuggestedValue = (
    tipo: string,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    if (!selectedEmployee) return null;
    
    // This is a simplified calculation - you might want to use your existing calculation logic
    const salarioDiario = selectedEmployee.baseSalary / 30;
    const valorHora = selectedEmployee.baseSalary / 240;
    
    switch (tipo) {
      case 'horas_extra':
        if (!horas || !subtipo) return null;
        const factors: Record<string, number> = {
          'diurnas': 1.25,
          'nocturnas': 1.75,
          'dominicales_diurnas': 2.0,
          'dominicales_nocturnas': 2.5,
          'festivas_diurnas': 2.0,
          'festivas_nocturnas': 2.5
        };
        return Math.round(valorHora * factors[subtipo] * horas);
        
      case 'vacaciones':
        if (!dias) return null;
        return Math.round(salarioDiario * dias);
        
      case 'incapacidad':
        if (!dias || !subtipo) return null;
        const percentages: Record<string, number> = {
          'comun': 0.667,
          'laboral': 1.0,
          'maternidad': 1.0
        };
        const diasPagados = subtipo === 'comun' ? Math.max(0, dias - 3) : dias;
        return Math.round(salarioDiario * percentages[subtipo] * diasPagados);
        
      default:
        return null;
    }
  };

  // Estado vacío
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
              {employees.map((employee, index) => {
                const novedades = getEmployeeNovedades(employee.id);
                const hasNovedades = novedades.hasNovedades;
                const novedadesValue = novedades.totalNeto;
                
                return (
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
                      <div className="flex items-center justify-center space-x-2">
                        {hasNovedades && (
                          <span className={`text-sm font-medium ${
                            novedadesValue >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(novedadesValue)}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenNovedades(employee)}
                          className={`h-8 w-8 p-0 rounded-full border-dashed border-2 ${
                            hasNovedades 
                              ? 'border-purple-300 text-purple-600 hover:border-purple-500 hover:text-purple-700 hover:bg-purple-50'
                              : 'border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50'
                          }`}
                          disabled={!canEdit}
                        >
                          {hasNovedades ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-gray-900">
                      {formatCurrency(employee.netPay + novedadesValue)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenNovedades(employee)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        disabled={!canEdit}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <NovedadUnifiedModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          employeeName={selectedEmployee.name}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          onCreateNovedad={handleCreateNovedad}
          calculateSuggestedValue={calculateSuggestedValue}
        />
      )}
    </>
  );
};
