
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { PayrollEmployee, NovedadForIBC } from '@/types/payroll';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { formatCurrency } from '@/lib/utils';
import { ConfigurationService } from '@/services/ConfigurationService';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { PayrollCalculationBackendService } from '@/services/PayrollCalculationBackendService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
  onRemoveEmployee?: (employeeId: string) => void;
  updateEmployeeCalculationsInDB?: (calculations: Record<string, {
    totalToPay: number; 
    ibc: number; 
    grossPay?: number; 
    deductions?: number; 
    healthDeduction?: number; 
    pensionDeduction?: number; 
    transportAllowance?: number; 
  }>) => Promise<void>;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onEmployeeNovedadesChange,
  onRemoveEmployee,
  updateEmployeeCalculationsInDB
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [novedadModalOpen, setNovedadModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<PayrollEmployee | null>(null);
  const [employeeCalculations, setEmployeeCalculations] = useState<Record<string, { 
    totalToPay: number; 
    ibc: number; 
    grossPay: number; 
    deductions: number; 
    healthDeduction: number; 
    pensionDeduction: number; 
    transportAllowance: number; 
  }>>({});
  const { toast } = useToast();

  // ✅ NUEVO: Calcular fecha del período para usar en cálculos de jornada legal
  const getPeriodDate = () => {
    if (startDate) {
      return new Date(startDate);
    }
    return new Date();
  };

  const {
    loadNovedadesTotals,
    createNovedad,
    getEmployeeNovedades,
    refreshEmployeeNovedades,
    isCreating,
    lastRefreshTime,
    getEmployeeNovedadesList
  } = usePayrollNovedadesUnified(currentPeriodId || '');

  // Cargar novedades cuando se monten los empleados o cambie el período
  useEffect(() => {
    if (employees.length > 0 && currentPeriodId) {
      console.log('📊 Cargando novedades para empleados, período:', currentPeriodId);
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
    }
  }, [employees, currentPeriodId, loadNovedadesTotals]);

  // ✅ NUEVO: Recalcular totales cuando cambien las novedades
  useEffect(() => {
    const recalculateAllEmployees = async () => {
      if (!currentPeriodId || employees.length === 0) return;

      console.log('🔄 Recalculando empleados con IBC correcto...');
      const newCalculations: Record<string, { 
        totalToPay: number; 
        ibc: number; 
        grossPay: number; 
        deductions: number; 
        healthDeduction: number; 
        pensionDeduction: number; 
        transportAllowance: number; 
      }> = {};

      for (const employee of employees) {
        try {
          // Obtener novedades del empleado
          const novedadesList = await getEmployeeNovedadesList(employee.id);
          const novedadesForIBC: NovedadForIBC[] = convertNovedadesToIBC(novedadesList);

          console.log('📝 Novedades para empleado:', employee.name, {
            count: novedadesForIBC.length,
            constitutivas: novedadesForIBC.filter(n => n.constitutivo_salario).length
          });

          // Calcular usando el backend con novedades
          const calculation = await PayrollCalculationBackendService.calculatePayroll({
            baseSalary: employee.baseSalary,
            workedDays: calculateWorkedDays(),
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: 'mensual',
            novedades: novedadesForIBC
          });

          newCalculations[employee.id] = {
            totalToPay: calculation.netPay,
            ibc: calculation.ibc,
            grossPay: calculation.grossPay,
            deductions: calculation.totalDeductions,
            healthDeduction: calculation.healthDeduction,
            pensionDeduction: calculation.pensionDeduction,
            transportAllowance: calculation.transportAllowance
          };

          console.log('✅ Empleado calculado:', employee.name, {
            ibc: calculation.ibc,
            netPay: calculation.netPay,
            healthDeduction: calculation.healthDeduction,
            pensionDeduction: calculation.pensionDeduction
          });

        } catch (error) {
          console.error('❌ Error calculando empleado:', employee.name, error);
          newCalculations[employee.id] = {
            totalToPay: 0,
            ibc: employee.baseSalary,
            grossPay: 0,
            deductions: 0,
            healthDeduction: 0,
            pensionDeduction: 0,
            transportAllowance: 0
          };
        }
      }

      setEmployeeCalculations(newCalculations);

      // ✅ NUEVA FUNCIONALIDAD: Persistir automáticamente en la BD
      if (updateEmployeeCalculationsInDB && Object.keys(newCalculations).length > 0) {
        console.log('💾 Activando persistencia automática de cálculos...');
        try {
          await updateEmployeeCalculationsInDB(newCalculations);
          console.log('✅ Cálculos persistidos automáticamente en BD');
        } catch (error) {
          console.error('❌ Error persistiendo cálculos:', error);
        }
      }
    };

    recalculateAllEmployees();
  }, [employees, currentPeriodId, lastRefreshTime, getEmployeeNovedadesList, updateEmployeeCalculationsInDB]);

  const calculateWorkedDays = () => {
    if (!startDate || !endDate) return 30;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(1, diffDays);
  };

  const workedDays = calculateWorkedDays();

  // Obtener configuración legal actual
  const getCurrentYearConfig = () => {
    const currentYear = new Date().getFullYear().toString();
    return ConfigurationService.getConfiguration(currentYear);
  };

  const handleOpenNovedadModal = (employee: PayrollEmployee) => {
    console.log('📝 Abriendo modal de novedades para:', employee.name);
    console.log('📅 Fecha del período:', startDate);
    setSelectedEmployee(employee);
    setNovedadModalOpen(true);
  };

  const handleCloseNovedadModal = async () => {
    if (selectedEmployee) {
      // Asegurar sincronización final al cerrar el modal
      console.log('🔄 Sincronización final al cerrar modal para:', selectedEmployee.name);
      await onEmployeeNovedadesChange(selectedEmployee.id);
    }
    setNovedadModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleNovedadSubmit = async (data: CreateNovedadData) => {
    if (!selectedEmployee || !currentPeriodId) {
      console.warn('⚠️ Faltan datos necesarios para crear novedad');
      return;
    }

    console.log('💾 Creando novedad:', data);
    
    try {
      const result = await createNovedad({
        ...data,
        empleado_id: selectedEmployee.id,
        periodo_id: currentPeriodId
      });
      
      if (result) {
        // Cerrar modal
        handleCloseNovedadModal();
        
        console.log('✅ Novedad creada y sincronizada exitosamente');
      }
    } catch (error) {
      console.error('❌ Error en creación de novedad:', error);
    }
  };

  // Callback para manejar cambios desde el modal (eliminaciones, etc.)
  const handleNovedadChange = async (employeeId: string) => {
    console.log('🔄 Novedad modificada para empleado:', employeeId);
    await onEmployeeNovedadesChange(employeeId);
  };

  const handleDeleteEmployee = (employee: PayrollEmployee) => {
    setEmployeeToDelete(employee);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete && onRemoveEmployee) {
      onRemoveEmployee(employeeToDelete.id);
      toast({
        title: "✅ Empleado removido",
        description: `${employeeToDelete.name} ha sido removido de esta liquidación`,
        className: "border-orange-200 bg-orange-50"
      });
      setEmployeeToDelete(null);
    }
  };

  const cancelDeleteEmployee = () => {
    setEmployeeToDelete(null);
  };

  // ✅ MEJORADO: Usar cálculos con IBC correcto
  const getTotalToPay = (employee: PayrollEmployee) => {
    const calculation = employeeCalculations[employee.id];
    return calculation ? calculation.totalToPay : 0;
  };

  const getEmployeeIBC = (employee: PayrollEmployee) => {
    const calculation = employeeCalculations[employee.id];
    return calculation ? calculation.ibc : employee.baseSalary;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre Empleado</TableHead>
            <TableHead className="text-right">Salario Base</TableHead>
            <TableHead className="text-right">IBC</TableHead>
            <TableHead className="text-center">Días Trabajados</TableHead>
            <TableHead className="text-center">Novedades</TableHead>
            <TableHead className="text-right">Total a Pagar Período</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const novedades = getEmployeeNovedades(employee.id);
            const totalToPay = getTotalToPay(employee);
            const ibc = getEmployeeIBC(employee);
            const hasNovedades = novedades.hasNovedades;

            return (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.position}</div>
                </TableCell>
                
                <TableCell className="text-right font-medium">
                  {formatCurrency(employee.baseSalary)}
                </TableCell>

                <TableCell className="text-right">
                  <div className={`font-medium ${ibc !== employee.baseSalary ? 'text-blue-600' : 'text-gray-600'}`}>
                    {formatCurrency(ibc)}
                  </div>
                  {ibc !== employee.baseSalary && (
                    <div className="text-xs text-blue-500">
                      +{formatCurrency(ibc - employee.baseSalary)} constitutivo
                    </div>
                  )}
                </TableCell>
                
                <TableCell className="text-center font-medium">
                  {workedDays} días
                </TableCell>
                
                <TableCell className="text-center">
                  <div className="flex items-center justify-start space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNovedadModal(employee)}
                      disabled={isCreating}
                      className="h-8 w-8 p-0 rounded-full border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {hasNovedades && (
                      <div className={`text-sm font-medium flex items-center space-x-1 ${
                        novedades.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {novedades.totalNeto >= 0 && <span>+</span>}
                        <span>{formatCurrency(novedades.totalNeto)}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell className="text-right font-semibold text-lg">
                  {formatCurrency(totalToPay)}
                </TableCell>

                <TableCell className="text-center">
                  {onRemoveEmployee && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEmployee(employee)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Modal de novedades */}
      {selectedEmployee && currentPeriodId && (
        <NovedadUnifiedModal
          open={novedadModalOpen}
          setOpen={setNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          periodId={currentPeriodId}
          onSubmit={handleNovedadSubmit}
          selectedNovedadType={null}
          onClose={handleCloseNovedadModal}
          onEmployeeNovedadesChange={handleNovedadChange}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={!!employeeToDelete} onOpenChange={cancelDeleteEmployee}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover empleado de la liquidación?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas remover a <strong>{employeeToDelete?.name}</strong> de esta liquidación? 
              Esta acción no afectará el registro del empleado en el módulo de empleados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteEmployee}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEmployee}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
