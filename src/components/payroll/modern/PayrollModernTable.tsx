import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { 
  Plus, 
  UserPlus, 
  MoreHorizontal, 
  Calculator, 
  FileText, 
  Send, 
  Trash2, 
  DollarSign,
  StickyNote,
  X,
  Edit
} from 'lucide-react';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { EmployeeLiquidationModal } from '@/components/payroll/modals/EmployeeLiquidationModal';
import { EmployeeCalculationModal } from '@/components/payroll/modals/EmployeeCalculationModal';
import { VoucherPreviewModal } from '@/components/payroll/modals/VoucherPreviewModal';
import { VoucherSendDialog } from '@/components/payroll/modals/VoucherSendDialog';
import { EmployeeNotesModal } from '@/components/payroll/notes/EmployeeNotesModal';
import { useNovedades } from '@/hooks/useNovedades';
import { usePayrollNovedades } from '@/hooks/usePayrollNovedades';
import { useEmployeeSelection } from '@/hooks/useEmployeeSelection';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { calcularValorHoraExtra, getDailyHours } from '@/utils/jornadaLegal';

interface PayrollModernTableProps {
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

type ActiveModal = 'novedades' | 'liquidation' | 'calculation' | 'voucherPreview' | 'voucherSend' | 'notes' | null;

export const PayrollModernTable: React.FC<PayrollModernTableProps> = ({
  employees,
  onUpdateEmployee,
  onRecalculate,
  isLoading,
  canEdit,
  periodoId,
  onRefreshEmployees,
  onDeleteEmployee,
  onDeleteMultipleEmployees
}) => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const {
    selectedEmployees,
    toggleEmployeeSelection,
    toggleAllEmployees,
    clearSelection
  } = useEmployeeSelection();

  const {
    createNovedad,
    isLoading: novedadesLoading
  } = useNovedades(periodoId);

  const {
    loadNovedadesTotals,
    refreshEmployeeNovedades,
    getEmployeeNovedades
  } = usePayrollNovedades(periodoId);

  // Cargar novedades al montar el componente
  useEffect(() => {
    if (employees.length > 0) {
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
    }
  }, [employees, loadNovedadesTotals]);

  const handleOpenModal = (modalType: ActiveModal, employee: PayrollEmployee) => {
    console.log('🔓 Abriendo modal:', modalType, 'para empleado:', employee.name);
    setActiveModal(modalType);
    setSelectedEmployee(employee);
  };

  const handleCloseModal = () => {
    console.log('🔒 Cerrando modal:', activeModal);
    setActiveModal(null);
    setSelectedEmployee(null);
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    console.log('🔄 PayrollModernTable - Creating novedad with data:', data);
    
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

  const handleDeleteEmployee = async (employeeId: string) => {
    if (onDeleteEmployee) {
      await onDeleteEmployee(employeeId);
      setShowDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    if (onDeleteMultipleEmployees && selectedEmployees.length > 0) {
      await onDeleteMultipleEmployees(selectedEmployees);
      clearSelection();
      setShowBulkDeleteConfirm(false);
    }
  };

  const calculateSuggestedValue = (
    tipo: string,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    if (!selectedEmployee) return null;
    
    console.log('🧮 PayrollModernTable - Calculating suggested value:', {
      tipo,
      subtipo,
      horas,
      dias,
      employeeSalary: selectedEmployee.baseSalary,
      periodoId: periodoId
    });
    
    // Use current date as period date (in a real scenario, this should come from the period)
    const fechaPeriodo = new Date();
    
    const salarioDiario = selectedEmployee.baseSalary / 30;
    // Use the dynamic legal workday calculation instead of fixed 240
    const valorHoraExtra = calcularValorHoraExtra(selectedEmployee.baseSalary, fechaPeriodo);
    
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
        // Use the dynamic hora extra value with the overtime factors
        const result = Math.round(valorHoraExtra * factors[subtipo] * horas);
        console.log(`💰 Overtime calculation: $${Math.round(valorHoraExtra)} × ${factors[subtipo]} × ${horas}h = $${result}`);
        return result;
        
      case 'recargo':
      case 'recargo_nocturno':
        if (!horas || !subtipo) return null;
        const recargoFactors: Record<string, number> = {
          'nocturno': 1.35,
          'dominical': 1.75,
          'nocturno_dominical': 2.10,
          'festivo': 1.75,
          'nocturno_festivo': 2.10
        };
        const recargoResult = Math.round(valorHoraExtra * recargoFactors[subtipo] * horas);
        console.log(`💰 Night shift calculation: $${Math.round(valorHoraExtra)} × ${recargoFactors[subtipo]} × ${horas}h = $${recargoResult}`);
        return recargoResult;
        
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
        
      case 'licencia_remunerada':
        if (!dias) return null;
        return Math.round(salarioDiario * dias);
        
      case 'ausencia':
        if (!dias) return null;
        return Math.round(salarioDiario * dias);
        
      default:
        return null;
    }
  };

  const allSelected = employees.length > 0 && employees.every(emp => selectedEmployees.includes(emp.id));
  const someSelected = selectedEmployees.length > 0;

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
        </div>
      </div>
    );
  }

  // Get period info for modals
  const periodInfo = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'mensual'
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={employees.length > 0 && selectedEmployees.length === employees.length}
                  onCheckedChange={() => toggleAllEmployees(employees.map(e => e.id))}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                Empleado
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                Salario Base
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                Novedades
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                Neto a Pagar
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => {
              const novedades = getEmployeeNovedades(employee.id);
              const hasNovedades = novedades.hasNovedades;
              const novedadesValue = novedades.totalNeto;
              
              return (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.position}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(employee.baseSalary)}
                  </td>
                  <td className="px-4 py-3 text-center">
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
                        onClick={() => handleOpenModal('novedades', employee)}
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
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(employee.netPay + novedadesValue)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal('novedades', employee)}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Novedades
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenModal('liquidation', employee)}>
                          <Calculator className="mr-2 h-4 w-4" />
                          Liquidación
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenModal('notes', employee)}>
                          <StickyNote className="mr-2 h-4 w-4" />
                          Notas
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setShowDeleteConfirm(employee.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {selectedEmployee && (
        <>
          <NovedadUnifiedModal
            isOpen={activeModal === 'novedades'}
            onClose={handleCloseModal}
            employeeName={selectedEmployee.name}
            employeeId={selectedEmployee.id}
            employeeSalary={selectedEmployee.baseSalary}
            onCreateNovedad={handleCreateNovedad}
            calculateSuggestedValue={calculateSuggestedValue}
          />
          
          <EmployeeLiquidationModal
            isOpen={activeModal === 'liquidation'}
            onClose={handleCloseModal}
            employee={selectedEmployee}
            periodId={periodoId}
            onUpdateEmployee={onUpdateEmployee}
            canEdit={canEdit}
          />

          <EmployeeNotesModal
            isOpen={activeModal === 'notes'}
            onClose={handleCloseModal}
            employeeId={selectedEmployee.id}
            employeeName={selectedEmployee.name}
            periodId={periodoId}
            periodName={`Período ${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
          />
        </>
      )}
    </>
  );
};
