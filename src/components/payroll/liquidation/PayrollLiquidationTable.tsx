
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { useNovedades } from '@/hooks/useNovedades';
import type { CreateNovedadData } from '@/types/novedades-enhanced';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  devengos: number;
  deducciones: number;
  total_pagar: number;
  dias_trabajados: number;
  auxilio_transporte: number;
  novedades_totals?: {
    totalDevengos: number;
    totalDeducciones: number;
    totalNeto: number;
    hasNovedades: boolean;
  };
}

interface PayrollLiquidationTableProps {
  employees: Employee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | null;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => void;
}

export const PayrollLiquidationTable = ({ 
  employees, 
  startDate, 
  endDate, 
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange
}: PayrollLiquidationTableProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isNovedadesModalOpen, setIsNovedadesModalOpen] = useState(false);
  const { createNovedad } = useNovedades(currentPeriodId || '');

  const totalPagar = employees.reduce((sum, emp) => sum + emp.total_pagar, 0);

  const handleOpenNovedades = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsNovedadesModalOpen(true);
  };

  const handleCloseNovedades = () => {
    setSelectedEmployeeId(null);
    setIsNovedadesModalOpen(false);
  };

  const handleNovedadChange = async () => {
    if (selectedEmployeeId) {
      await onEmployeeNovedadesChange(selectedEmployeeId);
    }
  };

  // Wrapper function to handle the enhanced CreateNovedadData type
  const handleCreateNovedad = async (data: CreateNovedadData): Promise<void> => {
    // The data already comes with company_id from the modal, so we can pass it directly
    await createNovedad(data);
    await handleNovedadChange();
  };

  const selectedEmployee = selectedEmployeeId 
    ? employees.find(emp => emp.id === selectedEmployeeId)
    : null;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Empleado</th>
              <th className="text-right p-4">Salario Base</th>
              <th className="text-right p-4">Días</th>
              <th className="text-center p-4">Novedades</th>
              <th className="text-right p-4">Total a Pagar</th>
              <th className="text-center p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const hasNovedades = employee.novedades_totals?.hasNovedades || false;
              
              return (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{employee.nombre} {employee.apellido}</div>
                    </div>
                  </td>
                  <td className="p-4 text-right">{formatCurrency(employee.salario_base)}</td>
                  <td className="p-4 text-right">{employee.dias_trabajados}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenNovedades(employee.id)}
                        className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 text-blue-600" />
                      </Button>
                      {hasNovedades && (
                        <div className="flex flex-col text-xs">
                          {employee.devengos > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs mb-1">
                              +{formatCurrency(employee.devengos)}
                            </Badge>
                          )}
                          {employee.deducciones > 0 && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                              -{formatCurrency(employee.deducciones)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold">
                    {formatCurrency(employee.total_pagar)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-gray-50">
              <td colSpan={4} className="p-4 text-right font-bold">Total General:</td>
              <td className="p-4 text-right font-bold text-lg">
                {formatCurrency(totalPagar)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modal de Novedades */}
      {selectedEmployee && currentPeriodId && (
        <NovedadUnifiedModal
          isOpen={isNovedadesModalOpen}
          onClose={handleCloseNovedades}
          employeeName={`${selectedEmployee.nombre} ${selectedEmployee.apellido}`}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.salario_base}
          periodId={currentPeriodId}
          onCreateNovedad={handleCreateNovedad}
          onNovedadChange={handleNovedadChange}
        />
      )}
    </>
  );
};
