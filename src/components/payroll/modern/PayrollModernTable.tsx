
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { MoreVertical, User, Edit, FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const {
    loadNovedadesForEmployee,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    getEmployeeNovedades,
    getEmployeeNovedadesCount,
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

  const toggleRowExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'valid':
        return { emoji: '🟢', text: 'Válido', color: 'text-green-600' };
      case 'error':
        return { emoji: '🔴', text: 'Error', color: 'text-red-600' };
      case 'warning':
        return { emoji: '🟡', text: 'Advertencia', color: 'text-amber-600' };
      default:
        return { emoji: '⚪', text: 'Desconocido', color: 'text-gray-600' };
    }
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aún no has agregado personas para liquidar
          </h3>
          <p className="text-gray-500 mb-6">
            Para comenzar con la liquidación de nómina, necesitas tener empleados activos en tu empresa.
          </p>
          <Button 
            onClick={() => window.location.href = '/app/employees'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Ir a Empleados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left p-4 text-sm font-medium text-gray-600 w-12"></th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">Empleado</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-600">Salario base</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-600">Días</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-600">Neto</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-600">Estado</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const isExpanded = expandedRows.has(employee.id);
                  const statusDisplay = getStatusDisplay(employee.status);
                  const novedadesCount = getEmployeeNovedadesCount(employee.id) || 0;

                  return (
                    <React.Fragment key={employee.id}>
                      <tr className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(employee.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-500" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {employee.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {employee.position}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(employee.baseSalary)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {employee.workedDays}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(employee.netPay)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span>{statusDisplay.emoji}</span>
                            <span className={`text-xs font-medium ${statusDisplay.color}`}>
                              {statusDisplay.text}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleOpenNovedades(employee)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar empleado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenNovedades(employee)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Agregar novedad
                                {novedadesCount > 0 && (
                                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                                    {novedadesCount}
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                              {onDeleteEmployee && (
                                <DropdownMenuItem 
                                  onClick={() => onDeleteEmployee(employee.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>

                      {/* Expanded row details */}
                      {isExpanded && (
                        <tr className="bg-gray-50/30">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Devengado:</span>
                                <span className="ml-2 font-medium text-green-600">
                                  {formatCurrency(employee.grossPay)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Deducciones:</span>
                                <span className="ml-2 font-medium text-red-600">
                                  {formatCurrency(employee.deductions)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Novedades:</span>
                                <span className="ml-2 font-medium text-blue-600">
                                  {novedadesCount} registrada{novedadesCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          onClick={onRecalculate}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 h-auto"
        >
          🧮 Liquidar período
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
