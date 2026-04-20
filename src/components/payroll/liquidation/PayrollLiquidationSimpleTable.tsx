import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, Users, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { PayrollEmployee, NovedadForIBC } from '@/types/payroll';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { formatCurrency } from '@/lib/utils';
import { ConfigurationService } from '@/services/ConfigurationService';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
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
import { NoveltyImportDrawer } from '@/components/payroll/novelties-import/NoveltyImportDrawer';
import { useEmployeeNovedadesCacheStore } from '@/stores/employeeNovedadesCacheStore';
import { SalaryIncreaseService } from '@/services/employees/SalaryIncreaseService';
import { VacationNovedadSyncService } from '@/services/VacationNovedadSyncService';

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
    effectiveWorkedDays?: number; 
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
  const [showNoveltyImportDrawer, setShowNoveltyImportDrawer] = useState(false);
  const [employeeCalculations, setEmployeeCalculations] = useState<Record<string, { 
    totalToPay: number; 
    ibc: number; 
    grossPay: number; 
    deductions: number; 
    healthDeduction: number; 
    pensionDeduction: number; 
    transportAllowance: number; 
    effectiveWorkedDays: number; 
  }>>({});
  const [optimisticCalculations, setOptimisticCalculations] = useState<Record<string, boolean>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState({ current: 0, total: 0 });
  const novedadChangedRef = useRef(false);
  const isRecalculatingRef = useRef(false);
  const pendingRecalcRef = useRef(false);
  const lastRecalcAtRef = useRef(0);
  const lastPersistedHashRef = useRef('');
  const prevKeyRef = useRef('');
  const isInitialCalcRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [hasOutdatedDbValues, setHasOutdatedDbValues] = useState(false);
  const [autoPersistedHash, setAutoPersistedHash] = useState('');
  const { companyId } = useCurrentCompany();

  const {
    loadNovedadesTotals,
    createNovedad,
    updateNovedad,
    getEmployeeNovedades,
    getEmployeeNovedadesSync,
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
    // ✅ Incluir companyId en la key: useCurrentCompany lo carga asíncronamente,
    // sin él en la key el effect se marca como ejecutado con companyId=null
    // y nunca vuelve a cargar los totales cuando el companyId llega.
    const currentKey = `${employees.length}-${currentPeriodId}-${companyId}`;
    if (employees.length > 0 && currentPeriodId && companyId && prevKeyRef.current !== currentKey) {
      console.log('📊 Cargando novedades para empleados, período:', currentPeriodId);
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
      prevKeyRef.current = currentKey;
    }
  }, [employees, currentPeriodId, companyId, loadNovedadesTotals]);

  // ✅ NUEVA FUNCIÓN: Calcular un solo empleado (optimización selectiva)
  const recalculateSingleEmployee = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    console.log('🎯 Recalculando empleado individual:', employee.name);
    setIsCalculating(true);
    setCalculationProgress({ current: 1, total: 1 });

    try {
      const novedadesList = await getEmployeeNovedadesList(employeeId);
      const novedadesForIBC: NovedadForIBC[] = convertNovedadesToIBC(novedadesList);

      const currentWorkedDays = workedDays;
      const periodType = periodForCalculation.tipo_periodo;
      const config = getCurrentYearConfig();

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
      const proratedTransport = eligible ? Math.round((config.auxilioTransporte / 30) * (calculation.effectiveWorkedDays ?? currentWorkedDays)) : 0;

      // Actualizar solo ese empleado
      setEmployeeCalculations(prev => ({
        ...prev,
        [employeeId]: {
          totalToPay: calculation.netPay,
          ibc: calculation.ibc,
          grossPay: calculation.grossPay,
          deductions: calculation.totalDeductions,
          healthDeduction: calculation.healthDeduction,
          pensionDeduction: calculation.pensionDeduction,
          transportAllowance: proratedTransport,
          effectiveWorkedDays: calculation.effectiveWorkedDays
        }
      }));

      console.log('✅ Empleado individual recalculado:', employee.name);
    } catch (error) {
      console.error('❌ Error recalculando empleado individual:', error);
    } finally {
      setIsCalculating(false);
      setCalculationProgress({ current: 0, total: 0 });
    }
  };

  // ✅ BATCH PROCESSING con Debouncing
  useEffect(() => {
    // Cancelar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Agrupar cambios en 500ms
    debounceTimerRef.current = setTimeout(async () => {
      // Re-entrancy protection
      if (isRecalculatingRef.current) {
        console.log('⏳ Recálculo en progreso, marcando como pendiente...');
        pendingRecalcRef.current = true;
        return;
      }

      if (!currentPeriodId || employees.length === 0 || !companyId) return;

      pendingRecalcRef.current = false;
      isRecalculatingRef.current = true;
      const now = Date.now();
      lastRecalcAtRef.current = now;

      setIsCalculating(true);
      setCalculationProgress({ current: 0, total: employees.length });

      console.log('🚀 Recalculando empleados con BATCH PROCESSING...');
      const newCalculations: Record<string, { 
        totalToPay: number; 
        ibc: number; 
        grossPay: number; 
        deductions: number; 
        healthDeduction: number; 
        pensionDeduction: number; 
        transportAllowance: number; 
        effectiveWorkedDays: number; 
      }> = {};

      try {
        const config = await getCurrentYearConfig();
        const currentWorkedDays = workedDays;
        const periodType = periodForCalculation.tipo_periodo;

        // ✅ UNA SOLA LLAMADA para todas las novedades del período
        console.log('📥 Obteniendo todas las novedades del período en una sola llamada...');
        const allNovedades = await NovedadesEnhancedService.getNovedadesByPeriod(currentPeriodId, companyId!);
        
        // ✅ Agrupar novedades por empleado en memoria
        const novedadesByEmployee = new Map<string, typeof allNovedades>();
        allNovedades.forEach(novedad => {
          if (!novedadesByEmployee.has(novedad.empleado_id)) {
            novedadesByEmployee.set(novedad.empleado_id, []);
          }
          novedadesByEmployee.get(novedad.empleado_id)!.push(novedad);
        });
        console.log(`✅ ${allNovedades.length} novedades agrupadas para ${novedadesByEmployee.size} empleados`);

        // ✅ Obtener salarios históricos vigentes a la fecha de inicio del período
        const periodStartDate = new Date(startDate);
        const historicalSalaries = await SalaryIncreaseService.getSalariesBatch(
          employees.map(e => e.id),
          periodStartDate,
          companyId!
        );

        // ✅ Preparar inputs para batch (SÍNCRONO - sin más llamadas HTTP)
        const batchInputs = employees.map((employee) => {
          const employeeNovedades = novedadesByEmployee.get(employee.id) || [];
          const novedadesForIBC: NovedadForIBC[] = convertNovedadesToIBC(employeeNovedades);
          // Usar salario vigente a la fecha del período; fallback al salario actual
          const effectiveSalary = historicalSalaries.get(employee.id) ?? employee.baseSalary;

          return {
            baseSalary: effectiveSalary,
            workedDays: currentWorkedDays,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: periodType,
            novedades: novedadesForIBC,
            year: year,
            salarioMinimo: config.salarioMinimo,
            auxilioTransporte: config.auxilioTransporte,
            uvt: config.uvt
          };
        });

        setCalculationProgress({ current: employees.length / 2, total: employees.length });

        // ✅ BATCH CON CHUNKING: máx 100 empleados por llamada para soportar cientos/miles
        const CHUNK_SIZE = 100;
        const batchResults = batchInputs.length <= CHUNK_SIZE
          ? await PayrollCalculationBackendService.calculateBatch(batchInputs, companyId!)
          : (await Promise.all(
              Array.from(
                { length: Math.ceil(batchInputs.length / CHUNK_SIZE) },
                (_, i) => PayrollCalculationBackendService.calculateBatch(
                  batchInputs.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), companyId!
                )
              )
            )).flat();
        
        // ✅ Mapear resultados
        employees.forEach((employee, index) => {
          const calculation = batchResults[index];
          const eligible = employee.baseSalary <= (config.salarioMinimo * 2);
          const proratedTransport = eligible ? Math.round((config.auxilioTransporte / 30) * (calculation.effectiveWorkedDays ?? currentWorkedDays)) : 0;

          newCalculations[employee.id] = {
            totalToPay: calculation.netPay,
            ibc: calculation.ibc,
            grossPay: calculation.grossPay,
            deductions: calculation.totalDeductions,
            healthDeduction: calculation.healthDeduction,
            pensionDeduction: calculation.pensionDeduction,
            transportAllowance: proratedTransport,
            effectiveWorkedDays: calculation.effectiveWorkedDays
          };
        });

        console.log(`✅ Batch completado: ${employees.length} empleados en una llamada`);

        setEmployeeCalculations(newCalculations);
        setOptimisticCalculations({}); // ✅ Limpiar flags optimistic

        // Persistir si hay cambios
        const calculationsHash = JSON.stringify(newCalculations);
        if (updateEmployeeCalculationsInDB && Object.keys(newCalculations).length > 0 && lastPersistedHashRef.current !== calculationsHash) {
          console.log('💾 Persistiendo cálculos batch en BD...');
          await updateEmployeeCalculationsInDB(newCalculations);
          lastPersistedHashRef.current = calculationsHash;
          setAutoPersistedHash(calculationsHash);
          console.log('✅ Cálculos batch persistidos');
        }

      } catch (error) {
        console.error('❌ Error en batch calculation:', error);
        if (isInitialCalcRef.current) {
          // Primer fallo: posible cold start del Edge Function. No mostrar error — reintento automático.
          console.warn('⚠️ Initial calculation failed (possible cold start), will retry on next render');
          isInitialCalcRef.current = false;
        } else {
          toast({
            title: "Error en cálculo",
            description: "Hubo un problema calculando la nómina. Intenta de nuevo.",
            variant: "destructive"
          });
        }
      } finally {
        setIsCalculating(false);
        setCalculationProgress({ current: 0, total: 0 });
        isRecalculatingRef.current = false;
        
        // Check if there's a pending recalculation
        if (pendingRecalcRef.current) {
          console.log('🔄 Ejecutando recálculo pendiente...');
          setTimeout(() => {
            debounceTimerRef.current = setTimeout(() => {}, 0);
          }, 100);
        }
      }
    }, 500); // ✅ Debounce de 500ms

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [employees.length, currentPeriodId, lastRefreshTime, year, companyId]);

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

  // Detectar si los valores guardados en DB difieren de los recién calculados
  useEffect(() => {
    if (isCalculating || Object.keys(employeeCalculations).length === 0) {
      setHasOutdatedDbValues(false);
      return;
    }
    // Si estos cálculos ya fueron guardados en DB, no mostrar banner
    const currentHash = JSON.stringify(employeeCalculations);
    if (autoPersistedHash === currentHash) {
      setHasOutdatedDbValues(false);
      return;
    }
    const isOutdated = employees.some(emp => {
      const freshCalc = employeeCalculations[emp.id];
      if (!freshCalc) return false;
      return Math.abs(freshCalc.grossPay - emp.grossPay) > 1;
    });
    setHasOutdatedDbValues(isOutdated);
  }, [employeeCalculations, employees, isCalculating, autoPersistedHash]);

  const handleUpdateDbValues = async () => {
    if (!updateEmployeeCalculationsInDB || Object.keys(employeeCalculations).length === 0) return;
    try {
      await updateEmployeeCalculationsInDB(employeeCalculations);
      setAutoPersistedHash(JSON.stringify(employeeCalculations));
      setHasOutdatedDbValues(false);
      toast({
        title: "Cálculos actualizados",
        description: "Los valores han sido actualizados con las tarifas correctas.",
        className: "border-green-200 bg-green-50"
      });
    } catch {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron guardar los cálculos actualizados.",
        variant: "destructive"
      });
    }
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
    
    // ✅ CRÍTICO: Refrescar novedades del empleado antes de cerrar
    if (selectedEmployee) {
      console.log('🔄 Refrescando novedades antes de cerrar modal para:', selectedEmployee.name);
      await refreshEmployeeNovedades(selectedEmployee.id);
      console.log('✅ Novedades refrescadas, columna actualizada');
    }
    
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
    
    // ✅ OPTIMISTIC UI: Estimación rápida antes de crear novedad
    if (data.valor > 0 && data.tipo_novedad === 'comision') {
      const estimate = data.valor * 0.92; // ~8% deducciones
      const currentTotal = employeeCalculations[selectedEmployee.id]?.totalToPay || 0;
      
      setEmployeeCalculations(prev => ({
        ...prev,
        [selectedEmployee.id]: {
          ...prev[selectedEmployee.id],
          totalToPay: currentTotal + estimate
        }
      }));
      
      setOptimisticCalculations(prev => ({ ...prev, [selectedEmployee.id]: true }));
      console.log('⚡ UI Optimista: Mostrando estimación instantánea +', formatCurrency(estimate));
    }
    
    const ABSENCE_TYPES = ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];

    try {
      let result;

      if (ABSENCE_TYPES.includes(data.tipo_novedad)) {
        // Ausencias → employee_absences (fuente única de verdad)
        // El trigger sync_vacation_to_novedad auto-crea el registro en payroll_novedades
        console.log('🏖️ Ausencia detectada, enrutando a VacationNovedadSyncService:', data.tipo_novedad);
        result = await VacationNovedadSyncService.createVacationAbsence({
          employee_id: selectedEmployee.id,
          type: data.tipo_novedad as any,
          subtipo: data.subtipo,
          start_date: data.fecha_inicio!,
          end_date: data.fecha_fin!,
          observations: data.observacion,
          periodo_id: currentPeriodId,
        });
      } else {
        // Novedades normales (horas extra, bonificaciones, etc.) → payroll_novedades directo
        result = await createNovedad({
          ...data,
          empleado_id: selectedEmployee.id,
          periodo_id: currentPeriodId
        });
      }

      if (result) {
        console.log('✅ Novedad creada exitosamente');
        novedadChangedRef.current = true;

        // ✅ NUEVO: Disparar recálculo batch automáticamente
        useEmployeeNovedadesCacheStore.getState().setLastRefreshTime(Date.now());
        console.log('⏰ lastRefreshTime actualizado - recálculo batch se ejecutará automáticamente');

        handleCloseNovedadModal();

        toast({
          title: "✅ Novedad creada",
          description: "El recálculo se ejecutará automáticamente",
          className: "border-green-200 bg-green-50"
        });
      }
    } catch (error: any) {
      console.error('❌ Error en creación de novedad:', error);
      toast({
        title: "❌ Error",
        description: error?.message || "No se pudo crear la novedad",
        variant: "destructive"
      });
      throw error; // Re-lanzar para que el modal no muestre toast de éxito
    }
  };

  const handleNovedadChange = async (employeeId: string) => {
    console.log('🔄 Novedad modificada para empleado:', employeeId);
    novedadChangedRef.current = true;
    
    // ✅ El recálculo batch se disparará automáticamente por lastRefreshTime
    // No es necesario recalcular individualmente
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
      {hasOutdatedDbValues && !isCalculating && (
        <div className="flex items-center gap-3 p-3 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm flex-1">
            Los valores de este período fueron calculados con tarifas de un año diferente. Los montos mostrados son correctos — actualiza para guardarlos.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 gap-1"
            onClick={handleUpdateDbValues}
          >
            <RefreshCw className="h-3 w-3" />
            Actualizar cálculos
          </Button>
        </div>
      )}
          <div className="h-12 mb-4 transition-opacity duration-200">
            {isCalculating ? (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 h-full">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">
                  Calculando nómina... {calculationProgress.current > 0 && `(${calculationProgress.current}/${calculationProgress.total})`}
                </span>
              </div>
            ) : (
              <div className="h-full opacity-0" aria-hidden="true"></div>
            )}
          </div>
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
              // ✅ CRÍTICO: No usar getEmployeeNovedades directamente (ahora es async)
              // Los totales ahora se calculan en el backend y se deben obtener de otra forma
              const totalToPay = getTotalToPay(employee);
              const ibc = getEmployeeIBC(employee);
              const transportAllowance = getEmployeeTransportAllowance(employee);
              const calc = employeeCalculations[employee.id];
              
              // 🔍 Debug: Verificar días efectivos
              if (calc && calc.effectiveWorkedDays !== workedDays) {
                console.log(`👤 ${employee.name}: efectivos=${calc.effectiveWorkedDays}, período=${workedDays}`);
              }

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
                    {calc?.effectiveWorkedDays ?? workedDays} días
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
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-semibold text-blue-600">
                          {formatCurrency(getEmployeeNovedadesSync(employee.id).totalNeto)}
                        </div>
                        {getEmployeeNovedadesSync(employee.id).hasNovedades && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>Dev: {formatCurrency(getEmployeeNovedadesSync(employee.id).totalDevengos)}</div>
                            <div>Ded: {formatCurrency(getEmployeeNovedadesSync(employee.id).totalDeducciones)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right bg-blue-100 font-semibold text-blue-600">
                    {formatCurrency(totalToPay)}
                    {optimisticCalculations[employee.id] && (
                      <span className="ml-2 text-xs text-blue-600">⏳</span>
                    )}
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
          onUpdate={updateNovedad}
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
