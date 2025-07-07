import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollAutoSaveService } from '@/services/PayrollAutoSaveService';
import { PayrollDeletionService } from '@/services/PayrollDeletionService';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';
import { PayrollActivePeriodsService } from '@/services/PayrollActivePeriodsService';
import { PayrollEmployee } from '@/types/payroll';
import { usePayrollAutoSave } from './usePayrollAutoSave';
import { usePayrollIntelligentLoad } from './usePayrollIntelligentLoad';
import { supabase } from '@/integrations/supabase/client';

interface DBEmployee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  devengos: number;
  deducciones: number;
  total_pagar: number;
  dias_trabajados: number;
  auxilio_transporte: number;
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

export const usePayrollLiquidation = () => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [removedEmployeeIds, setRemovedEmployeeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const [isAddingEmployees, setIsAddingEmployees] = useState(false);
  const { toast } = useToast();

  // Intelligent load hook
  const { intelligentLoad, isLoading: isIntelligentLoading } = usePayrollIntelligentLoad();

  // Auto-save integration with CORRECTED closure handling
  const { triggerAutoSave, isSaving, lastSaveTime } = usePayrollAutoSave({
    periodId: currentPeriodId,
    employees,
    removedEmployeeIds,
    enabled: true,
    onSaveSuccess: () => {
      console.log('✅ Auto-save success callback - clearing removed employee IDs');
      setRemovedEmployeeIds([]);
    },
    onSaveError: (error) => {
      console.error('❌ Auto-save error callback - handling save failure:', error);
    }
  });

  useEffect(() => {
    // Solo verificar períodos activos si el usuario está en la página de liquidación
    // y no mostrar modal automático inmediatamente
    const checkActivePeriodsDelayed = async () => {
      // Esperar un poco antes de verificar para evitar modales inmediatos
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkForActivePeriod();
    };

    checkActivePeriodsDelayed();
  }, []);

  const checkForActivePeriod = async () => {
    try {
      // Primero limpiar períodos fantasma
      await PayrollActivePeriodsService.cleanGhostPeriods();
      
      // Luego verificar si hay períodos realmente activos
      const result = await PayrollActivePeriodsService.checkForActivePeriod();
      
      if (result.has_active_period && result.period) {
        console.log('📋 Período activo encontrado:', result.period);
        
        // Mostrar confirmación más amigable
        const shouldRecover = window.confirm(
          `¿Continuar con la liquidación en progreso?\n\n` +
          `📋 Período: ${result.period.periodo}\n` +
          `👥 Empleados: ${result.period.employees_count}\n` +
          `⏰ Última actividad: ${new Date(result.period.last_activity_at).toLocaleString()}\n\n` +
          `Selecciona "Aceptar" para continuar o "Cancelar" para iniciar una nueva liquidación.`
        );

        if (shouldRecover) {
          await recoverActivePeriod(result.period);
        } else {
          // Si el usuario no quiere continuar, marcar el período como cancelado
          await cancelActivePeriod(result.period.id);
        }
      }
    } catch (error) {
      console.error('Error checking for active period:', error);
    }
  };

  const cancelActivePeriod = async (periodId: string) => {
    try {
      await supabase
        .from('payroll_periods_real')
        .update({ estado: 'cancelado' })
        .eq('id', periodId);
      
      console.log('✅ Período activo cancelado por el usuario');
    } catch (error) {
      console.error('❌ Error cancelando período activo:', error);
    }
  };

  const recoverActivePeriod = async (activePeriod: any) => {
    setIsRecovering(true);
    try {
      console.log('🔄 Recovering active period with intelligent load:', activePeriod.id);
      
      // Set period info
      setCurrentPeriodId(activePeriod.id);
      setStartDate(activePeriod.fecha_inicio);
      setEndDate(activePeriod.fecha_fin);
      
      // USAR INTELLIGENT LOAD para recovery
      const result = await intelligentLoad(activePeriod.fecha_inicio, activePeriod.fecha_fin);
      setEmployees(result.employees);
      
      toast({
        title: "Liquidación recuperada",
        description: `Se recuperó la liquidación con ${result.employees.length} empleados`,
        className: "border-blue-200 bg-blue-50"
      });
      
    } catch (error) {
      console.error('❌ Error recovering active period:', error);
      toast({
        title: "Error",
        description: "No se pudo recuperar la liquidación anterior",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const loadEmployees = async (startDate: string, endDate: string) => {
    setIsLoading(true);
    setStartDate(startDate);
    setEndDate(endDate);
    
    // Limpiar removed employee IDs solo cuando cargamos nuevos empleados
    setRemovedEmployeeIds([]);
    
    try {
      console.log('🧠 usePayrollLiquidation - Using INTELLIGENT LOAD for dates:', { startDate, endDate });
      
      const result = await intelligentLoad(startDate, endDate);
      
      setCurrentPeriodId(result.periodId);
      setEmployees(result.employees);
      
      if (result.isRecovery) {
        console.log('✅ Successfully recovered existing payroll data');
      } else {
        console.log('✅ Successfully loaded fresh employee data');
      }
      
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error in intelligent load:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addEmployees = async (employeeIds: string[]) => {
    if (!currentPeriodId || !startDate || !endDate) {
      console.warn('⚠️ usePayrollLiquidation - Missing period info when adding employees');
      throw new Error('No hay información del período activo');
    }

    console.log('🔄 usePayrollLiquidation - INICIANDO adición de empleados con persistencia inmediata CORREGIDA');
    console.log('📊 usePayrollLiquidation - Empleados a agregar:', employeeIds);
    console.log('📊 usePayrollLiquidation - Estado previo:', {
      currentEmployeesCount: employees.length,
      periodId: currentPeriodId
    });
    
    setIsAddingEmployees(true);
    
    // Capturar estado previo para rollback
    const previousEmployees = [...employees];
    console.log('💾 usePayrollLiquidation - Estado anterior capturado para rollback');
    
    try {
      console.log('🔄 usePayrollLiquidation - Cargando datos de empleados específicos');
      const newEmployeesData = await PayrollLiquidationService.loadSpecificEmployeesForPeriod(
        employeeIds, 
        startDate, 
        endDate
      );
      console.log('✅ usePayrollLiquidation - Datos de empleados cargados:', newEmployeesData.length);

      console.log('🔄 usePayrollLiquidation - Procesando empleados con novedades');
      const processedNewEmployees = await Promise.all(
        newEmployeesData.map(async (employee) => {
          console.log(`🔄 usePayrollLiquidation - Procesando empleado: ${employee.nombre}`);
          
          const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
            employee.id,
            currentPeriodId
          );
          
          const totalDeducciones = employee.salud_empleado + employee.pension_empleado + 
                                 employee.fondo_solidaridad + employee.retencion_fuente + 
                                 novedadesTotals.totalDeducciones;
          
          const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
          const totalConNovedades = salarioProporcional + employee.auxilio_transporte + 
                                  novedadesTotals.totalDevengos - totalDeducciones;
          
          return {
            ...employee,
            devengos: novedadesTotals.totalDevengos,
            deducciones: totalDeducciones,
            deducciones_novedades: novedadesTotals.totalDeducciones,
            total_pagar: totalConNovedades,
            novedades_totals: novedadesTotals
          };
        })
      );

      const transformedNewEmployees = processedNewEmployees.map(transformEmployee);
      console.log('✅ usePayrollLiquidation - Empleados transformados:', transformedNewEmployees.length);
      
      // PASO 1: Crear estado actualizado pero NO actualizar UI todavía
      const updatedEmployees = [...previousEmployees, ...transformedNewEmployees];
      console.log('📊 usePayrollLiquidation - Estado preparado (NO actualizado en UI aún):', updatedEmployees.length);
      
      console.log('💾 usePayrollLiquidation - INICIANDO auto-save CORREGIDO con empleados explícitos');
      
      // PASO 2: CORRECCIÓN CRÍTICA - Pasar empleados explícitos al auto-save
      const saveResult = await triggerAutoSave(updatedEmployees);
      
      if (!saveResult) {
        console.error('❌ usePayrollLiquidation - Auto-save FALLÓ, NO actualizando UI');
        throw new Error('Failed to save employees to database');
      }
      
      console.log('✅ usePayrollLiquidation - Auto-save EXITOSO, actualizando UI');
      
      // PASO 3: Solo ahora actualizar la UI tras confirmación de guardado exitoso
      setEmployees(updatedEmployees);
      
      toast({
        title: "Empleados agregados",
        description: `Se agregaron ${transformedNewEmployees.length} empleado(s) y se guardaron automáticamente`,
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ usePayrollLiquidation - ERROR CRÍTICO agregando empleados:', error);
      
      // ROLLBACK: No es necesario revertir el estado porque nunca se actualizó la UI
      console.log('🔄 usePayrollLiquidation - Sin necesidad de rollback - UI nunca se actualizó');
      
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados. No se realizaron cambios.",
        variant: "destructive"
      });
      
      throw error;
    } finally {
      console.log('🏁 usePayrollLiquidation - FINALIZANDO adición de empleados');
      setIsAddingEmployees(false);
    }
  };

  const removeEmployee = async (employeeId: string) => {
    console.log('🗑️ usePayrollLiquidation - Removing employee (IMPROVED):', employeeId);
    
    if (!currentPeriodId) {
      console.error('❌ No current period ID for employee removal');
      toast({
        title: "Error",
        description: "No se puede eliminar: no hay período activo",
        variant: "destructive"
      });
      return;
    }
    
    setIsRemovingEmployee(true);
    
    const employeeToRemove = employees.find(emp => emp.id === employeeId);
    const currentEmployeesSnapshot = [...employees];
    const currentRemovedSnapshot = [...removedEmployeeIds];
    
    // Update UI state immediately
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    setRemovedEmployeeIds(prev => {
      if (!prev.includes(employeeId)) {
        return [...prev, employeeId];
      }
      return prev;
    });
    
    try {
      console.log('💾 Executing DIRECT database deletion for employee');
      
      const companyId = await PayrollAutoSaveService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }
      
      await PayrollDeletionService.deleteEmployeeFromPeriod(
        currentPeriodId,
        employeeId,
        companyId
      );
      
      await PayrollDeletionService.logDeletion(
        currentPeriodId,
        employeeId,
        companyId,
        employeeToRemove?.name || `Employee ${employeeId}`
      );
      
      const remainingEmployees = employees.filter(emp => emp.id !== employeeId);
      await PayrollAutoSaveService.updatePeriodActivity(currentPeriodId);
      
      setRemovedEmployeeIds(prev => prev.filter(id => id !== employeeId));
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido removido permanentemente de esta liquidación",
        className: "border-green-200 bg-green-50"
      });
      
      console.log('✅ usePayrollLiquidation - Employee removal completed successfully');
      
    } catch (error) {
      console.error('❌ Error in improved employee removal:', error);
      
      // ROLLBACK: Restaurar estado anterior
      setEmployees(currentEmployeesSnapshot);
      setRemovedEmployeeIds(currentRemovedSnapshot);
      
      toast({
        title: "Error",
        description: "No se pudo eliminar el empleado. Se revirtieron los cambios.",
        variant: "destructive"
      });
    } finally {
      setIsRemovingEmployee(false);
    }
  };

  const transformEmployee = (dbEmployee: DBEmployee): PayrollEmployee => ({
    id: dbEmployee.id,
    name: `${dbEmployee.nombre} ${dbEmployee.apellido}`,
    position: 'Empleado',
    baseSalary: dbEmployee.salario_base,
    workedDays: dbEmployee.dias_trabajados,
    extraHours: 0,
    disabilities: 0,
    bonuses: dbEmployee.devengos,
    absences: 0,
    grossPay: dbEmployee.total_pagar + dbEmployee.deducciones,
    deductions: dbEmployee.deducciones,
    netPay: dbEmployee.total_pagar,
    status: 'valid',
    errors: [],
    transportAllowance: dbEmployee.auxilio_transporte,
    employerContributions: 0
  });

  const refreshEmployeeNovedades = async (employeeId: string) => {
    if (!currentPeriodId) {
      console.warn('⚠️ usePayrollLiquidation - No current period ID when refreshing novedades');
      return;
    }
    
    console.log('🔄 usePayrollLiquidation - Refreshing novedades for employee:', employeeId);
    
    try {
      const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
        employeeId,
        currentPeriodId
      );
      
      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          const updatedEmployee = {
            ...emp,
            bonuses: novedadesTotals.totalDevengos,
            deductions: novedadesTotals.totalDeducciones,
            netPay: emp.grossPay - novedadesTotals.totalDeducciones + novedadesTotals.totalDevengos
          };
          
          return updatedEmployee;
        }
        return emp;
      }));
      
      await triggerAutoSave();
      console.log('✅ usePayrollLiquidation - Employee novedades refreshed successfully');
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error refreshing employee novedades:', error);
    }
  };

  const liquidatePayroll = async (startDate: string, endDate: string) => {
    setIsLiquidating(true);
    try {
      const dbEmployees = employees.map(emp => ({
        id: emp.id,
        nombre: emp.name.split(' ')[0] || emp.name,
        apellido: emp.name.split(' ').slice(1).join(' ') || '',
        salario_base: emp.baseSalary,
        total_pagar: emp.netPay,
        devengos: emp.bonuses,
        deducciones: emp.deducciones,
        dias_trabajados: emp.workedDays,
        auxilio_transporte: emp.transportAllowance,
        salud_empleado: 0,
        pension_empleado: 0,
        fondo_solidaridad: 0,
        retencion_fuente: 0,
        deducciones_novedades: 0
      }));
      
      const result = await PayrollLiquidationService.liquidatePayroll(dbEmployees, startDate, endDate);
      
      if (result.success) {
        toast({
          title: "✅ Liquidación completada",
          description: `Se liquidaron ${employees.length} empleados con deducciones detalladas para auditoría`,
          className: "border-green-200 bg-green-50"
        });
        
        // Reset state
        setEmployees([]);
        setRemovedEmployeeIds([]);
        setCurrentPeriodId(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error liquidating payroll:', error);
      toast({
        title: "Error en liquidación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLiquidating(false);
    }
  };

  const updateEmployeeSalary = async (employeeId: string, newSalary: number) => {
    try {
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, baseSalary: newSalary } : emp
      ));
      
      console.log(`✅ usePayrollLiquidation - Employee salary updated: ${employeeId} -> ${newSalary}`);
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error updating employee salary:', error);
      throw error;
    }
  };

  return {
    employees,
    isLoading: isLoading || isRecovering || isIntelligentLoading || isAddingEmployees,
    isLiquidating,
    currentPeriodId,
    startDate,
    endDate,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    updateEmployeeSalary,
    // Auto-save status
    isAutoSaving: isSaving,
    lastAutoSaveTime: lastSaveTime,
    triggerManualSave: triggerAutoSave,
    // New status indicators
    isRemovingEmployee,
    isAddingEmployees,
    // Debug info
    removedEmployeeIds
  };
};
