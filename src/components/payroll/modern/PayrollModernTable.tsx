import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { EmployeeLiquidationModal } from '@/components/payroll/modals/EmployeeLiquidationModal';
import { EmployeeCalculationModal } from '@/components/payroll/modals/EmployeeCalculationModal';
import { VoucherPreviewModal } from '@/components/payroll/modals/VoucherPreviewModal';
import { VoucherSendDialog } from '@/components/payroll/modals/VoucherSendDialog';
import { EmployeeNotesModal } from '@/components/payroll/notes/EmployeeNotesModal';
import { useNovedades } from '@/hooks/useNovedades';
import { useEmployeeSelection } from '@/hooks/useEmployeeSelection';
import { CreateNovedadData } from '@/types/novedades-enhanced';

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
  // Estado simplificado para modales
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

  // Handler único para abrir modales
  const handleOpenModal = (modalType: ActiveModal, employee: PayrollEmployee) => {
    console.log('🔓 Abriendo modal:', modalType, 'para empleado:', employee.name);
    setActiveModal(modalType);
    setSelectedEmployee(employee);
  };

  // Handler único para cerrar modales
  const handleCloseModal = () => {
    console.log('🔒 Cerrando modal:', activeModal);
    setActiveModal(null);
    setSelectedEmployee(null);
    console.log('✅ Modal cerrado completamente - Estado limpio');
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    console.log('🔄 PayrollModernTable - Creating novedad with data:', data);
    console.log('📅 Period ID being used:', periodoId);
    
    const createData: CreateNovedadData = {
      empleado_id: selectedEmployee.id,
      periodo_id: periodoId, // Use the periodoId passed from parent
      ...data
    };
    
    console.log('📤 PayrollModernTable - Final create data:', createData);
    
    await createNovedad(createData, true);
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
      employeeSalary: selectedEmployee.baseSalary
    });
    
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
        const result = Math.round(valorHora * factors[subtipo] * horas);
        console.log('💰 Overtime calculation result:', result);
        return result;
        
      case 'recargo':
        if (!horas || !subtipo) return null;
        const recargoFactors: Record<string, number> = {
          'nocturno': 1.35,
          'dominical': 1.75,
          'nocturno_dominical': 2.10,
          'festivo': 1.75,
          'nocturno_festivo': 2.10
        };
        return Math.round(valorHora * recargoFactors[subtipo] * horas);
        
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

  // Get period info for modals
  const periodInfo = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'mensual'
  };

  return (
    <>
      <div className="bg-white">
        {/* Bulk Actions Bar */}
        {someSelected && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-700">
                {selectedEmployees.length} empleado{selectedEmployees.length !== 1 ? 's' : ''} seleccionado{selectedEmployees.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={!canEdit}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar seleccionados
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-3 w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleAllEmployees(employees.map(emp => emp.id))}
                    disabled={!canEdit}
                  />
                </th>
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
                  <td className="py-4 px-3">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                      disabled={!canEdit}
                    />
                  </td>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModal('novedades', employee)}
                      className="h-8 w-8 p-0 rounded-full border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      disabled={!canEdit}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="py-4 px-6 text-right font-semibold text-gray-900">
                    {formatCurrency(employee.netPay)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={!canEdit}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleOpenModal('liquidation', employee)}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Liquidar empleado
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenModal('notes', employee)}>
                          <StickyNote className="h-4 w-4 mr-2" />
                          Agregar nota
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenModal('calculation', employee)}>
                          <Calculator className="h-4 w-4 mr-2" />
                          Ver cálculos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenModal('voucherPreview', employee)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Ver colilla de pago
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenModal('voucherSend', employee)}>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar colilla de pago
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setShowDeleteConfirm(employee.id)}
                          className="text-red-600 focus:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar eliminación
              </h3>
              <p className="text-gray-600 mb-4">
                ¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteEmployee(showDeleteConfirm)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Dialog */}
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar eliminación múltiple
              </h3>
              <p className="text-gray-600 mb-4">
                ¿Estás seguro de que deseas eliminar {selectedEmployees.length} empleado{selectedEmployees.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  Eliminar todos
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Todos los modales usando CustomModal */}
      <NovedadUnifiedModal
        isOpen={activeModal === 'novedades'}
        onClose={handleCloseModal}
        employeeName={selectedEmployee?.name || ''}
        employeeId={selectedEmployee?.id || ''}
        employeeSalary={selectedEmployee?.baseSalary || 0}
        onCreateNovedad={handleCreateNovedad}
        calculateSuggestedValue={calculateSuggestedValue}
      />

      <EmployeeLiquidationModal
        isOpen={activeModal === 'liquidation'}
        onClose={handleCloseModal}
        employee={selectedEmployee}
        onUpdateEmployee={onUpdateEmployee}
        canEdit={canEdit}
      />

      <EmployeeCalculationModal
        isOpen={activeModal === 'calculation'}
        onClose={handleCloseModal}
        employee={selectedEmployee}
      />

      <VoucherPreviewModal
        isOpen={activeModal === 'voucherPreview'}
        onClose={handleCloseModal}
        employee={selectedEmployee}
        period={periodInfo}
      />

      <VoucherSendDialog
        isOpen={activeModal === 'voucherSend'}
        onClose={handleCloseModal}
        employee={selectedEmployee}
        period={periodInfo}
      />

      <EmployeeNotesModal
        isOpen={activeModal === 'notes'}
        onClose={handleCloseModal}
        employeeId={selectedEmployee?.id || ''}
        employeeName={selectedEmployee?.name || ''}
        periodId={periodoId}
        periodName={`Período actual`}
      />
    </>
  );
};
