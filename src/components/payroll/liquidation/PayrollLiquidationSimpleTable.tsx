
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

          // ✅ INFORMACIÓN NORMATIVA DE NOVEDADES
          const constitutivas = novedadesForIBC.filter(n => n.constitutivo_salario);
          const noConstitutivas = novedadesForIBC.filter(n => !n.constitutivo_salario);
          
          console.log('📊 Análisis normativo de novedades:', employee.name, {
            totalNovedades: novedadesForIBC.length,
            constitutivas: constitutivas.length,
            noConstitutivas: noConstitutivas.length,
            impactoIBC: constitutivas.reduce((sum, n) => sum + n.valor, 0),
            detalleConstitutivas: constitutivas.map(n => `${n.tipo_novedad}: $${n.valor}`),
            detalleNoConstitutivas: noConstitutivas.map(n => `${n.tipo_novedad}: $${n.valor}`)
          });

          // ✅ CORRECCIÓN CRÍTICA: Determinar tipo de período correcto basado en días trabajados
          const currentWorkedDays = calculateWorkedDays();
          const periodType = currentWorkedDays <= 15 ? 'quincenal' : 'mensual';
          
          console.log('🎯 Calculando empleado con período correcto:', {
            employee: employee.name,
            workedDays: currentWorkedDays,
            periodType,
            baseSalary: employee.baseSalary
          });

          console.log('💰 ENVIANDO AL BACKEND - IBC NORMATIVO:', {
            employee: employee.name,
            salarioOriginal: employee.baseSalary,
            periodType,
            novedadesCount: novedadesForIBC.length
          });

          // ✅ CORRECCIÓN CRÍTICA: Enviar salario mensual completo - el edge function hará la proporcionalidad
          const calculation = await PayrollCalculationBackendService.calculatePayroll({
            baseSalary: employee.baseSalary, // ✅ ENVIAR SALARIO MENSUAL COMPLETO
            workedDays: currentWorkedDays,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: periodType, // ✅ Usar tipo de período correcto
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
    
    // CORRECCIÓN DEFINITIVA: Para períodos quincenales SIEMPRE usar 15 días
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = start.getDate();
    const endDay = end.getDate();
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    
    // DETECTAR PERÍODOS QUINCENALES POR PATRÓN DE FECHAS MÁS FLEXIBLE
    const isFirstQuincenal = startDay === 1 && sameMonth;
    const isSecondQuincenal = startDay === 16 && sameMonth;
    
    // VERIFICACIÓN ADICIONAL: Si el período empieza en 16, es quincenal independientemente del día final
    const isDefinitelyQuincenal = startDay === 16;
    
    console.log('🔍 ANÁLISIS DE PERÍODO:', {
      startDate,
      endDate,
      startDay,
      endDay,
      sameMonth,
      isFirstQuincenal,
      isSecondQuincenal,
      isDefinitelyQuincenal
    });
    
    if (isFirstQuincenal || isSecondQuincenal || isDefinitelyQuincenal) {
      console.log('📊 PERÍODO QUINCENAL DETECTADO - ASIGNANDO 15 DÍAS:', {
        motivo: isDefinitelyQuincenal ? 'Inicia día 16' : 'Patrón quincenal detectado',
        diasAsignados: 15
      });
      return 15;
    }
    
    // Para períodos no quincenales, calcular normalmente
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    console.log('📊 PERÍODO NO QUINCENAL - DÍAS CALCULADOS:', {
      startDate,
      endDate,
      diasCalculados: diffDays
    });
    
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
      <div className="w-full overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Nombre Empleado</TableHead>
              <TableHead className="text-right min-w-[120px]">Salario Base</TableHead>
              <TableHead className="text-right min-w-[120px]">IBC</TableHead>
              <TableHead className="text-center min-w-[100px]">Días Trabajados</TableHead>
              
              {/* DEVENGOS */}
              <TableHead className="text-right min-w-[120px] bg-green-50">Auxilio Transporte</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Horas Extra</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">H.E. Diurnas</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">H.E. Nocturnas</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Recargo Nocturno</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Recargo Dominical</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Bonificaciones</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Bonif. Adicionales</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Comisiones</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Prima</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Cesantías</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Intereses Cesantías</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Vacaciones</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Licencias Remuneradas</TableHead>
              <TableHead className="text-right min-w-[120px] bg-green-50">Otros Devengos</TableHead>
              <TableHead className="text-right min-w-[140px] bg-green-100 font-semibold">Total Devengado</TableHead>
              
              {/* DEDUCCIONES */}
              <TableHead className="text-right min-w-[120px] bg-red-50">Salud Empleado</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Pensión Empleado</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Retención Fuente</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Fondo Solidaridad</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Préstamos</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Embargos</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Incapacidades</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Descuentos Varios</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Otros Descuentos</TableHead>
              <TableHead className="text-right min-w-[120px] bg-red-50">Otras Deducciones</TableHead>
              <TableHead className="text-right min-w-[140px] bg-red-100 font-semibold">Total Deducciones</TableHead>
              
              {/* TOTALES */}
              <TableHead className="text-center min-w-[100px] bg-blue-50">Novedades</TableHead>
              <TableHead className="text-right min-w-[140px] bg-blue-100 font-bold">Neto Pagado</TableHead>
              <TableHead className="text-center min-w-[100px] sticky right-0 bg-background z-10">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const novedades = getEmployeeNovedades(employee.id);
              const totalToPay = getTotalToPay(employee);
              const ibc = getEmployeeIBC(employee);
              const hasNovedades = novedades.hasNovedades;
              const calc = employeeCalculations[employee.id];

              return (
                <TableRow key={employee.id}>
                  {/* Empleado (Fijo) */}
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </TableCell>
                  
                  {/* Básicos */}
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
                  
                  {/* DEVENGOS */}
                  <TableCell className="text-right">{formatCurrency(calc?.transportAllowance || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right bg-green-100 font-semibold">
                    {formatCurrency(calc?.grossPay || 0)}
                  </TableCell>
                  
                  {/* DEDUCCIONES */}
                  <TableCell className="text-right">{formatCurrency(calc?.healthDeduction || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(calc?.pensionDeduction || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right bg-red-100 font-semibold">
                    {formatCurrency(calc?.deductions || 0)}
                  </TableCell>
                  
                  {/* NOVEDADES Y TOTALES */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-2">
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
                        <div className={`text-sm font-medium ${
                          novedades.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {novedades.totalNeto >= 0 ? '+' : ''}{formatCurrency(novedades.totalNeto)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right bg-blue-100 font-bold text-lg">
                    {formatCurrency(totalToPay)}
                  </TableCell>

                  {/* Acciones (Fijo) */}
                  <TableCell className="text-center sticky right-0 bg-background z-10">
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
      </div>

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
