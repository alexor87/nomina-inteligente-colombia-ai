import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { 
  Calculator, 
  Download, 
  Send, 
  Edit,
  StickyNote,
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2
} from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { EmployeeCalculationModal } from '../modals/EmployeeCalculationModal';
import { VoucherPreviewModal } from '../modals/VoucherPreviewModal';
import { VoucherSendDialog } from '../modals/VoucherSendDialog';
import { EmployeeLiquidationModal } from '../modals/EmployeeLiquidationModal';
import { EmployeeNotesModal } from '../notes/EmployeeNotesModal';
import { NovedadUnifiedModal } from '../novedades/NovedadUnifiedModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { useNovedades } from '@/hooks/useNovedades';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  currentPeriod?: { tipo_periodo?: string } | null;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
  updateEmployeeCalculationsInDB?: (calculations: Record<string, {
    totalToPay: number; 
    ibc: number; 
    grossPay?: number; 
    deductions?: number; 
    healthDeduction?: number; 
    pensionDeduction?: number; 
    transportAllowance?: number; 
  }>) => Promise<void>;
  year: string;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  currentPeriod,
  onRemoveEmployee,
  onEmployeeNovedadesChange,
  updateEmployeeCalculationsInDB,
  year
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);
  const [showVoucherSend, setShowVoucherSend] = useState(false);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showNovedadesModal, setShowNovedadesModal] = useState(false);
  const [isRemoveAlertOpen, setIsRemoveAlertOpen] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState<string | null>(null);
  const [isCalculationsUpdateLoading, setIsCalculationsUpdateLoading] = useState(false);

  const { companyId } = useCurrentCompany();
  const { createNovedad } = useNovedades(currentPeriodId || '');

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee || !currentPeriodId) return;
    
    try {
      console.log('📝 Creating novedad:', data);
      
      const novedadData: CreateNovedadData = {
        empleado_id: selectedEmployee.id,
        periodo_id: currentPeriodId,
        company_id: companyId || '',
        ...data
      };
      
      await createNovedad(novedadData);
      
      // Refresh employee novedades
      if (onEmployeeNovedadesChange) {
        await onEmployeeNovedadesChange(selectedEmployee.id);
      }
      
      toast.success('Novedad creada exitosamente');
    } catch (error: any) {
      console.error('Error creating novedad:', error);
      toast.error(error.message || 'Error al crear la novedad');
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setEmployeeToRemove(employeeId);
    setIsRemoveAlertOpen(true);
  };

  const confirmRemoveEmployee = async () => {
    if (!employeeToRemove) return;
    setIsRemoveAlertOpen(false);
    onRemoveEmployee(employeeToRemove);
    setEmployeeToRemove(null);
  };

  const cancelRemoveEmployee = () => {
    setIsRemoveAlertOpen(false);
    setEmployeeToRemove(null);
  };

  const handleUpdateCalculationsInDB = async () => {
    if (!updateEmployeeCalculationsInDB) {
      console.warn('updateEmployeeCalculationsInDB prop not provided');
      return;
    }

    setIsCalculationsUpdateLoading(true);

    try {
      const calculations = employees.reduce((acc: Record<string, any>, employee) => {
        acc[employee.id] = {
          totalToPay: employee.netPay,
          ibc: employee.ibc,
          grossPay: employee.grossPay,
          deductions: employee.deductions,
          healthDeduction: employee.healthDeduction,
          pensionDeduction: employee.pensionDeduction,
          transportAllowance: employee.transportAllowance
        };
        return acc;
      }, {});

      await updateEmployeeCalculationsInDB(calculations);
      toast.success('Cálculos actualizados en la base de datos exitosamente');
    } catch (error: any) {
      console.error('Error updating calculations in DB:', error);
      toast.error(error.message || 'Error al actualizar los cálculos en la base de datos');
    } finally {
      setIsCalculationsUpdateLoading(false);
    }
  };

  const canUpdateCalculations = useMemo(() => {
    return typeof updateEmployeeCalculationsInDB === 'function';
  }, [updateEmployeeCalculationsInDB]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Lista de empleados para el período actual.
        </h3>
        {canUpdateCalculations && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateCalculationsInDB}
            disabled={isCalculationsUpdateLoading}
            className="flex items-center gap-2"
          >
            {isCalculationsUpdateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cálculos en DB
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 border border-gray-200 text-left">Empleado</th>
              <th className="px-4 py-2 border border-gray-200 text-left">Cargo</th>
              <th className="px-4 py-2 border border-gray-200 text-right">Salario</th>
              <th className="px-4 py-2 border border-gray-200 text-right">Devengado</th>
              <th className="px-4 py-2 border border-gray-200 text-right">Deducciones</th>
              <th className="px-4 py-2 border border-gray-200 text-right">Neto a Pagar</th>
              <th className="px-4 py-2 border border-gray-200 text-center">Estado</th>
              <th className="px-4 py-2 border border-gray-200 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border border-gray-200">
                  <div className="font-medium">{employee.name}</div>
                </td>
                <td className="px-4 py-2 border border-gray-200">{employee.position}</td>
                <td className="px-4 py-2 border border-gray-200 text-right">{formatCurrency(employee.baseSalary)}</td>
                <td className="px-4 py-2 border border-gray-200 text-right">{formatCurrency(employee.grossPay)}</td>
                <td className="px-4 py-2 border border-gray-200 text-right">{formatCurrency(employee.deductions)}</td>
                <td className="px-4 py-2 border border-gray-200 text-right font-bold">{formatCurrency(employee.netPay)}</td>
                <td className="px-4 py-2 border border-gray-200 text-center">
                  {employee.status === 'valid' ? (
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Válido
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-red-500 border-red-500">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Error
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-2 border border-gray-200 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCalculationModal(true)}
                      title="Ver cálculos detallados"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVoucherPreview(true)}
                      title="Vista previa del comprobante"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVoucherSend(true)}
                      title="Enviar comprobante por email"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotesModal(true)}
                      title="Ver/Agregar notas del empleado"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowNovedadesModal(true);
                      }}
                      title="Agregar novedad"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLiquidationModal(true)}
                      title="Editar liquidación"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará al empleado de este período de nómina.
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={cancelRemoveEmployee}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmRemoveEmployee}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <EmployeeCalculationModal
        isOpen={showCalculationModal}
        onClose={() => setShowCalculationModal(false)}
        employee={selectedEmployee}
      />

      <VoucherPreviewModal
        isOpen={showVoucherPreview}
        onClose={() => setShowVoucherPreview(false)}
        employee={selectedEmployee}
        period={{
          startDate: startDate,
          endDate: endDate,
          type: currentPeriod?.tipo_periodo || 'Mensual',
        }}
      />

      <VoucherSendDialog
        isOpen={showVoucherSend}
        onClose={() => setShowVoucherSend(false)}
        employee={selectedEmployee}
        period={{
          startDate: startDate,
          endDate: endDate,
          type: currentPeriod?.tipo_periodo || 'Mensual',
        }}
      />

      <EmployeeLiquidationModal
        isOpen={showLiquidationModal}
        onClose={() => setShowLiquidationModal(false)}
        employee={selectedEmployee}
        periodId={currentPeriodId}
        onUpdateEmployee={(id, updates) => {
          // Implement the update logic here
          console.log(`Updating employee ${id} with`, updates);
        }}
        canEdit={true}
      />

      <EmployeeNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        employeeId={selectedEmployee?.id}
        employeeName={selectedEmployee?.name}
        periodId={currentPeriodId}
        periodName={`${startDate} - ${endDate}`}
      />

      {/* Modal de Novedades */}
      <NovedadUnifiedModal
        open={showNovedadesModal}
        setOpen={setShowNovedadesModal}
        employeeId={selectedEmployee?.id}
        employeeSalary={selectedEmployee?.baseSalary}
        periodId={currentPeriodId}
        onSubmit={handleCreateNovedad}
        selectedNovedadType={null}
        onClose={() => {
          setShowNovedadesModal(false);
          setSelectedEmployee(null);
        }}
        onEmployeeNovedadesChange={onEmployeeNovedadesChange}
        startDate={startDate}
        endDate={endDate}
        companyId={companyId}
      />
      
      <AlertDialog open={isRemoveAlertOpen} onOpenChange={setIsRemoveAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Realmente quieres eliminar a este empleado de la liquidación?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRemoveEmployee}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveEmployee}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
