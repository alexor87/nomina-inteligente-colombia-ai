
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Eye } from 'lucide-react';
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
  // Deducciones detalladas
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  deducciones_novedades: number;
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
  const [showDeductionDetail, setShowDeductionDetail] = useState<string | null>(null);
  const { createNovedad } = useNovedades(currentPeriodId || '');

  const totalPagar = employees.reduce((sum, emp) => sum + emp.total_pagar, 0);

  const handleOpenNovedades = (employeeId: string) => {
    console.log('🔄 PayrollLiquidationTable - Opening novedades modal for employee:', employeeId);
    setSelectedEmployeeId(employeeId);
    setIsNovedadesModalOpen(true);
  };

  const handleCloseNovedades = () => {
    console.log('🔄 PayrollLiquidationTable - Closing novedades modal');
    setSelectedEmployeeId(null);
    setIsNovedadesModalOpen(false);
  };

  const handleNovedadChange = async () => {
    if (selectedEmployeeId) {
      console.log('🔄 PayrollLiquidationTable - Triggering novedad change for employee:', selectedEmployeeId);
      console.log('📊 PayrollLiquidationTable - Current employee state before change:', 
        employees.find(emp => emp.id === selectedEmployeeId)
      );
      
      await onEmployeeNovedadesChange(selectedEmployeeId);
      
      console.log('📊 PayrollLiquidationTable - Employee state after change should be updated');
    } else {
      console.warn('⚠️ PayrollLiquidationTable - No selected employee ID when handling novedad change');
    }
  };

  const handleCreateNovedad = async (data: CreateNovedadData): Promise<void> => {
    console.log('📝 PayrollLiquidationTable - Creating novedad:', data);
    console.log('👤 PayrollLiquidationTable - For employee:', selectedEmployeeId);
    
    await createNovedad(data);
    console.log('✅ PayrollLiquidationTable - Novedad created, triggering recalculation');
    
    await handleNovedadChange();
  };

  const selectedEmployee = selectedEmployeeId 
    ? employees.find(emp => emp.id === selectedEmployeeId)
    : null;

  const calculateNovedadesNetas = (employee: Employee): number => {
    const netas = employee.devengos - employee.deducciones_novedades;
    console.log(`💰 PayrollLiquidationTable - Novedades netas for ${employee.nombre}:`, {
      devengos: employee.devengos,
      deducciones: employee.deducciones_novedades,
      netas: netas
    });
    return netas;
  };

  const toggleDeductionDetail = (employeeId: string) => {
    setShowDeductionDetail(showDeductionDetail === employeeId ? null : employeeId);
  };

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
              <th className="text-right p-4">Deducciones</th>
              <th className="text-right p-4">Total a Pagar</th>
              <th className="text-center p-4">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const novedadesNetas = calculateNovedadesNetas(employee);
              const hasNovedades = employee.novedades_totals?.hasNovedades || false;
              const showDetail = showDeductionDetail === employee.id;
              
              console.log(`📋 PayrollLiquidationTable - Rendering employee ${employee.nombre}:`, {
                hasNovedades,
                novedadesNetas,
                totalPagar: employee.total_pagar,
                deducciones: employee.deducciones
              });
              
              return (
                <React.Fragment key={employee.id}>
                  <tr className="border-b hover:bg-gray-50">
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
                        {hasNovedades && novedadesNetas !== 0 && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              novedadesNetas > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {novedadesNetas > 0 ? '+' : ''}{formatCurrency(novedadesNetas)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="font-medium">{formatCurrency(employee.deducciones)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDeductionDetail(employee.id)}
                          className="h-6 w-6 p-0"
                          title="Ver detalle de deducciones"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold">
                      {formatCurrency(employee.total_pagar)}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                  
                  {/* Fila de detalle de deducciones para auditoría DIAN/UGPP */}
                  {showDetail && (
                    <tr className="bg-blue-50">
                      <td colSpan={7} className="p-4">
                        <div className="text-sm">
                          <h4 className="font-semibold mb-2 text-blue-800">
                            📋 Detalle de Deducciones - Auditoría DIAN/UGPP
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <span className="text-gray-600">Salud (4%):</span>
                              <div className="font-mono">{formatCurrency(employee.salud_empleado)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Pensión (4%):</span>
                              <div className="font-mono">{formatCurrency(employee.pension_empleado)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Fondo Solidaridad:</span>
                              <div className="font-mono">{formatCurrency(employee.fondo_solidaridad)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Retención Fuente:</span>
                              <div className="font-mono">{formatCurrency(employee.retencion_fuente)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Novedades Deduc.:</span>
                              <div className="font-mono">{formatCurrency(employee.deducciones_novedades)}</div>
                            </div>
                            <div className="border-l-2 border-blue-300 pl-4">
                              <span className="text-blue-800 font-semibold">Total Deducciones:</span>
                              <div className="font-mono font-bold">{formatCurrency(employee.deducciones)}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-gray-50">
              <td colSpan={5} className="p-4 text-right font-bold">Total General:</td>
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
