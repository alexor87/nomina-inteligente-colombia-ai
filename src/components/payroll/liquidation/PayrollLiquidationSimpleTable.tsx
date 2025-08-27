import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { PayrollEmployee, NovedadForIBC } from '@/types/payroll';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
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
import { PayrollCalculationService } from '@/services/PayrollCalculationService';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  currentPeriod?: { tipo_periodo?: string } | null;
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
  year: string;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  currentPeriod,
  onEmployeeNovedadesChange,
  onRemoveEmployee,
  updateEmployeeCalculationsInDB,
  year
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
  const novedadChangedRef = useRef(false);
  const isRecalculatingRef = useRef(false);
  const pendingRecalcRef = useRef(false);
  const lastRecalcAtRef = useRef(0);
  const lastPersistedHashRef = useRef('');
  const prevKeyRef = useRef('');
  const { toast } = useToast();
  const { companyId } = useCurrentCompany();

  const {
    loadNovedadesTotals,
    createNovedad,
    getEmployeeNovedades,
    refreshEmployeeNovedades,
    isCreating,
    lastRefreshTime,
    getEmployeeNovedadesList
  } = usePayrollNovedadesUnified({ 
    companyId,
    periodId: currentPeriodId || '', 
    enabled: !!currentPeriodId 
  });

  const getPeriodDate = () => {
    if (startDate) {
      return new Date(startDate);
    }
    return new Date();
  };

  useEffect(() => {
    const currentKey = `${employees.length}-${currentPeriodId}`;
    if (employees.length > 0 && currentPeriodId && prevKeyRef.current !== currentKey) {
      console.log('📊 Cargando novedades para empleados, período:', currentPeriodId);
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
      prevKeyRef.current = currentKey;
    }
  }, [employees, currentPeriodId, loadNovedadesTotals]);

  useEffect(() => {
    const recalculateAllEmployees = async () => {
      // Re-entrancy protection with pending queue
      if (isRecalculatingRef.current) {
        console.log('⏳ Recálculo en progreso, marcando como pendiente...');
        pendingRecalcRef.current = true;
        return;
      }

      // Reset pending flag and start recalculation
      pendingRecalcRef.current = false;

      // Throttling - minimum 1 second between recalculations
      const now = Date.now();
      if (now - lastRecalcAtRef.current < 1000) {
        console.log('⏰ Throttling recálculo, muy pronto desde el último');
        return;
      }

      if (!currentPeriodId || employees.length === 0) return;

      isRecalculatingRef.current = true;
      lastRecalcAtRef.current = now;

      console.log('🔄 Recalculando empleados con auxilio de transporte correcto...');
      const newCalculations: Record<string, { 
        totalToPay: number; 
        ibc: number; 
        grossPay: number; 
        deductions: number; 
        healthDeduction: number; 
        pensionDeduction: number; 
        transportAllowance: number; 
      }> = {};

      const config = getCurrentYearConfig();

      for (const employee of employees) {
        try {
          const novedadesList = await getEmployeeNovedadesList(employee.id);
          const novedadesForIBC: NovedadForIBC[] = convertNovedadesToIBC(novedadesList);

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

          const currentWorkedDays = workedDays;
          const periodType = periodForCalculation.tipo_periodo;
          
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

          const calculation = await PayrollCalculationBackendService.calculatePayroll({
            baseSalary: employee.baseSalary,
            workedDays: currentWorkedDays,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: periodType,
            novedades: novedadesForIBC,
            year: year
          });

          const eligible = employee.baseSalary <= (config.salarioMinimo * 2);
          const proratedTransport = eligible ? Math.round((config.auxilioTransporte / 30) * currentWorkedDays) : 0;
          
          console.log('🚌 CORRECCIÓN AUXILIO DE TRANSPORTE:', {
            employee: employee.name,
            salarioBase: employee.baseSalary,
            limite2SMMLV: config.salarioMinimo * 2,
            eligible,
            auxilioMensual: config.auxilioTransporte,
            diasTrabajados: currentWorkedDays,
            proratedTransport,
            backendTransport: calculation.transportAllowance
          });

          const adjustedGrossPay = calculation.grossPay - calculation.transportAllowance + proratedTransport;
          const adjustedNetPay = calculation.netPay - calculation.transportAllowance + proratedTransport;

          newCalculations[employee.id] = {
            totalToPay: adjustedNetPay,
            ibc: calculation.ibc,
            grossPay: adjustedGrossPay,
            deductions: calculation.totalDeductions,
            healthDeduction: calculation.healthDeduction,
            pensionDeduction: calculation.pensionDeduction,
            transportAllowance: proratedTransport
          };

          console.log('✅ Empleado calculado con auxilio corregido:', employee.name, {
            ibc: calculation.ibc,
            netPay: adjustedNetPay,
            grossPay: adjustedGrossPay,
            transportAllowance: proratedTransport,
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

      // Only persist if calculations have changed
      const calculationsHash = JSON.stringify(newCalculations);
      if (updateEmployeeCalculationsInDB && Object.keys(newCalculations).length > 0 && lastPersistedHashRef.current !== calculationsHash) {
        console.log('💾 Activando persistencia automática de cálculos...');
        try {
          await updateEmployeeCalculationsInDB(newCalculations);
          lastPersistedHashRef.current = calculationsHash;
          console.log('✅ Cálculos persistidos automáticamente en BD');
        } catch (error) {
          console.error('❌ Error persistiendo cálculos:', error);
        }
      }

      isRecalculatingRef.current = false;
      
      // Check if there's a pending recalculation
      if (pendingRecalcRef.current) {
        console.log('🔄 Ejecutando recálculo pendiente...');
        setTimeout(recalculateAllEmployees, 100);
      }
    };

    recalculateAllEmployees();
  }, [employees.length, currentPeriodId, lastRefreshTime, year]);

  const periodForCalculation = {
    tipo_periodo: (currentPeriod?.tipo_periodo || 'quincenal') as 'quincenal' | 'mensual',
    fecha_inicio: startDate,
    fecha_fin: endDate
  };
  
  const daysInfo = PayrollCalculationService.getDaysInfo(periodForCalculation);
  const workedDays = daysInfo.legalDays;
  
  console.log('🎯 SERVICIO CENTRALIZADO - DÍAS TRABAJADOS:', {
    startDate,
    endDate,
    periodType: periodForCalculation.tipo_periodo,
    legalDays: daysInfo.legalDays,
    realDays: daysInfo.realDays
  });

  const getCurrentYearConfig = () => {
    return ConfigurationService.getConfiguration(year);
  };

  const handleOpenNovedadModal = (employee: PayrollEmployee) => {
    console.log('📝 Abriendo modal de novedades para:', employee.name);
    console.log('📅 Fecha del período:', startDate);
    novedadChangedRef.current = false;
    setSelectedEmployee(employee);
    setNovedadModalOpen(true);
  };

  const handleCloseNovedadModal = async () => {
    console.log('🚪 Cerrando modal de novedades');
    setNovedadModalOpen(false);
    setSelectedEmployee(null);
    novedadChangedRef.current = false;
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
        console.log('✅ Novedad creada exitosamente - marcando cambio para evitar recarga duplicada');
        novedadChangedRef.current = true;
        handleCloseNovedadModal();
      }
    } catch (error) {
      console.error('❌ Error en creación de novedad:', error);
    }
  };

  const handleNovedadChange = async (employeeId: string) => {
    console.log('🔄 Novedad modificada para empleado:', employeeId);
    novedadChangedRef.current = true;
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

  const getTotalToPay = (employee: PayrollEmployee) => {
    const calculation = employeeCalculations[employee.id];
    return calculation ? calculation.totalToPay : 0;
  };

  const getEmployeeIBC = (employee: PayrollEmployee) => {
    const calculation = employeeCalculations[employee.id];
    return calculation ? calculation.ibc : employee.baseSalary;
  };

  const getEmployeeTransportAllowance = (employee: PayrollEmployee) => {
    const calculation = employeeCalculations[employee.id];
    return calculation ? calculation.transportAllowance : 0;
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
              <TableHead className="text-right min-w-[140px] bg-green-100 font-semibold">Total Devengado</TableHead>
              <TableHead className="text-right min-w-[140px] bg-red-100 font-semibold">Total Deducciones</TableHead>
              <TableHead className="text-center min-w-[100px]">Novedades</TableHead>
              <TableHead className="text-right min-w-[140px] bg-blue-100 font-bold">Neto Pagado</TableHead>
              <TableHead className="text-center min-w-[100px] sticky right-0 bg-background z-10">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const novedades = getEmployeeNovedades(employee.id);
              const totalToPay = getTotalToPay(employee);
              const ibc = getEmployeeIBC(employee);
              const transportAllowance = getEmployeeTransportAllowance(employee);
              const calc = employeeCalculations[employee.id];

              return (
                <TableRow key={employee.id}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </TableCell>
                  
                  <TableCell className="text-right font-medium">
                    {formatCurrency(employee.baseSalary)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="font-medium text-gray-600">
                      {formatCurrency(ibc)}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center font-medium">
                    {workedDays} días
                  </TableCell>
                  
                  <TableCell className="text-right bg-green-100 font-semibold">
                    {formatCurrency(calc?.grossPay || 0)}
                  </TableCell>
                  
                  <TableCell className="text-right bg-red-100 font-semibold">
                    {formatCurrency(calc?.deductions || 0)}
                  </TableCell>
                  
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
                      <div className={`text-sm font-medium ${
                        novedades.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {novedades.totalNeto >= 0 ? '+' : ''}{formatCurrency(novedades.totalNeto)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right bg-blue-100 font-semibold text-blue-600">
                    {formatCurrency(totalToPay)}
                  </TableCell>

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

      {selectedEmployee && currentPeriodId && (
        <NovedadUnifiedModal
          open={novedadModalOpen}
          setOpen={setNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          periodId={currentPeriodId}
          companyId={companyId || ''}
          onSubmit={handleNovedadSubmit}
          selectedNovedadType={null}
          onClose={handleCloseNovedadModal}
          onEmployeeNovedadesChange={handleNovedadChange}
          startDate={startDate}
          endDate={endDate}
        />
      )}

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
