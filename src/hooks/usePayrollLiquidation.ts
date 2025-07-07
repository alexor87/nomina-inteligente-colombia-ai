import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollAutoSaveService } from '@/services/PayrollAutoSaveService';
import { PayrollDeletionService } from '@/services/PayrollDeletionService';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';
import { PayrollEmployee } from '@/types/payroll';
import { usePayrollAutoSave } from './usePayrollAutoSave';

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
  const { toast } = useToast();

  // Auto-save integration - MEJORADO para limpiar IDs solo después de eliminación exitosa
  const { triggerAutoSave, isSaving, lastSaveTime } = usePayrollAutoSave({
    periodId: currentPeriodId,
    employees,
    removedEmployeeIds,
    enabled: true,
    onSaveSuccess: () => {
      // NUEVO: Solo limpiar removed IDs después de confirmación de guardado exitoso
      console.log('✅ Auto-save success callback - clearing removed employee IDs');
      setRemovedEmployeeIds([]);
    }
  });

  // 
  useEffect(() => {
    checkForActivePeriod();
  }, []);

  const checkForActivePeriod = async () => {
    try {
      const activePeriod = await PayrollAutoSaveService.getActivePeriod();
      
      if (activePeriod && activePeriod.employees_count > 0) {
        console.log('📋 Found active period:', activePeriod);
        
        const shouldRecover = window.confirm(
          `Se encontró una liquidación en progreso:\n\n` +
          `Período: ${activePeriod.periodo}\n` +
          `Empleados: ${activePeriod.employees_count}\n` +
          `Última actividad: ${new Date(activePeriod.last_activity_at).toLocaleString()}\n\n` +
          `¿Desea continuar con esta liquidación?`
        );

        if (shouldRecover) {
          await recoverActivePeriod(activePeriod);
        }
      }
    } catch (error) {
      console.error('Error checking for active period:', error);
    }
  };

  /**
   * MEJORADO: Recovery que NO limpia removedEmployeeIds automáticamente
   */
  const recoverActivePeriod = async (activePeriod: any) => {
    setIsRecovering(true);
    try {
      console.log('🔄 Recovering active period with improved logic:', activePeriod.id);
      
      // Set period info
      setCurrentPeriodId(activePeriod.id);
      setStartDate(activePeriod.fecha_inicio);
      setEndDate(activePeriod.fecha_fin);
      
      // CRÍTICO: NO limpiar removedEmployeeIds aquí
      // Dejar que el recovery respete eliminaciones previas
      
      // Load draft employees with FILTERED validation (excluye eliminados)
      const draftEmployees = await PayrollAutoSaveService.loadDraftEmployeesFiltered(activePeriod.id);
      
      // Additional validation: filter out any employees that might be corrupted
      const validEmployees = draftEmployees.filter(emp => emp.id && emp.name);
      
      // Load and recalculate novedades for each employee
      const employeesWithNovedades = await Promise.all(
        validEmployees.map(async (employee) => {
          console.log(`🔄 Recalculating novedades for employee: ${employee.name}`);
          
          const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
            employee.id,
            activePeriod.id
          );
          
          return {
            ...employee,
            bonuses: novedadesTotals.totalDevengos,
            deductions: employee.deductions + novedadesTotals.totalDeducciones,
            netPay: employee.grossPay + novedadesTotals.totalDevengos - (employee.deductions + novedadesTotals.totalDeducciones)
          };
        })
      );
      
      setEmployees(employeesWithNovedades);
      
      toast({
        title: "Liquidación recuperada",
        description: `Se recuperó la liquidación con ${employeesWithNovedades.length} empleados`,
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

  // 
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

  const loadEmployees = async (startDate: string, endDate: string) => {
    setIsLoading(true);
    setStartDate(startDate);
    setEndDate(endDate);
    
    // CRÍTICO: Limpiar removed employee IDs solo cuando cargamos nuevos empleados
    setRemovedEmployeeIds([]);
    
    try {
      console.log('🔄 usePayrollLiquidation - Loading employees for period:', { startDate, endDate });
      
      const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate);
      
      const periodId = await PayrollLiquidationService.ensurePeriodExists(startDate, endDate);
      setCurrentPeriodId(periodId);
      
      console.log('📋 usePayrollLiquidation - Period ID set:', periodId);
      
      // 
      const employeesWithNovedades = await Promise.all(
        employeesData.map(async (employee) => {
          console.log(`🔄 usePayrollLiquidation - Loading novedades for employee: ${employee.nombre}`);
          
          const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
            employee.id,
            periodId
          );
          
          console.log(`📊 usePayrollLiquidation - Novedades totals for ${employee.nombre}:`, novedadesTotals);
          
          const totalDeducciones = employee.salud_empleado + employee.pension_empleado + 
                                 employee.fondo_solidaridad + employee.retencion_fuente + 
                                 novedadesTotals.totalDeducciones;
          
          const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
          const totalConNovedades = salarioProporcional + employee.auxilio_transporte + 
                                  novedadesTotals.totalDevengos - totalDeducciones;
          
          const updatedEmployee = {
            ...employee,
            devengos: novedadesTotals.totalDevengos,
            deducciones: totalDeducciones,
            deducciones_novedades: novedadesTotals.totalDeducciones,
            total_pagar: totalConNovedades,
            novedades_totals: novedadesTotals
          };
          
          console.log(`✅ usePayrollLiquidation - Final employee data for ${employee.nombre}:`, {
            devengos: updatedEmployee.devengos,
            deducciones: updatedEmployee.deducciones,
            total_pagar: updatedEmployee.total_pagar,
            hasNovedades: updatedEmployee.novedades_totals?.hasNovedades
          });
          
          return updatedEmployee;
        })
      );
      
      const transformedEmployees = employeesWithNovedades.map(transformEmployee);
      setEmployees(transformedEmployees);
      
      // NO auto-save after loading - not critical
      
      toast({
        title: "Empleados cargados",
        description: `Se cargaron ${transformedEmployees.length} empleados activos con deducciones detalladas`,
      });
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 
  const addEmployees = async (employeeIds: string[]) => {
    if (!currentPeriodId || !startDate || !endDate) {
      console.warn('⚠️ usePayrollLiquidation - Missing period info when adding employees');
      throw new Error('No hay información del período activo');
    }

    console.log('🔄 usePayrollLiquidation - Adding employees:', employeeIds);
    
    try {
      const newEmployeesData = await PayrollLiquidationService.loadSpecificEmployeesForPeriod(
        employeeIds, 
        startDate, 
        endDate
      );

      const processedNewEmployees = await Promise.all(
        newEmployeesData.map(async (employee) => {
          console.log(`🔄 usePayrollLiquidation - Processing new employee: ${employee.nombre}`);
          
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
      setEmployees(prev => [...prev, ...transformedNewEmployees]);
      
      // NO auto-save after adding - not critical
      
      console.log('✅ usePayrollLiquidation - Employees added successfully:', transformedNewEmployees.length);
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error adding employees:', error);
      throw error;
    }
  };

  /**
   * CORREGIDO: removeEmployee con lógica atómica y estado correcto
   */
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
    
    // FASE 1: Actualizar estado UI inmediatamente para feedback
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
      // FASE 2: ELIMINACIÓN DIRECTA EN BASE DE DATOS
      console.log('💾 Executing DIRECT database deletion for employee');
      
      const companyId = await PayrollAutoSaveService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }
      
      // Usar el servicio de eliminación directa
      await PayrollDeletionService.deleteEmployeeFromPeriod(
        currentPeriodId,
        employeeId,
        companyId
      );
      
      // FASE 3: Registrar eliminación para auditoría
      await PayrollDeletionService.logDeletion(
        currentPeriodId,
        employeeId,
        companyId,
        employeeToRemove?.name || `Employee ${employeeId}`
      );
      
      // FASE 4: Actualizar totales del período
      const remainingEmployees = employees.filter(emp => emp.id !== employeeId);
      await PayrollAutoSaveService.updatePeriodActivity(currentPeriodId);
      
      // ÉXITO: Limpiar IDs de eliminados ya que se persistió
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

  // 
  const refreshEmployeeNovedades = async (employeeId: string) => {
    if (!currentPeriodId) {
      console.warn('⚠️ usePayrollLiquidation - No current period ID when refreshing novedades');
      return;
    }
    
    console.log('🔄 usePayrollLiquidation - Refreshing novedades for employee:', employeeId);
    console.log('📋 usePayrollLiquidation - Using period ID:', currentPeriodId);
    
    try {
      const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
        employeeId,
        currentPeriodId
      );
      
      console.log('📊 usePayrollLiquidation - New novedades totals:', novedadesTotals);
      
      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          console.log(`🔄 usePayrollLiquidation - Updating employee ${emp.name} with new novedades`);
          
          const updatedEmployee = {
            ...emp,
            bonuses: novedadesTotals.totalDevengos,
            deductions: novedadesTotals.totalDeducciones,
            netPay: emp.grossPay - novedadesTotals.totalDeducciones + novedadesTotals.totalDevengos
          };
          
          console.log('✅ usePayrollLiquidation - New employee state:', {
            bonuses: updatedEmployee.bonuses,
            deductions: updatedEmployee.deductions,
            netPay: updatedEmployee.netPay
          });
          
          return updatedEmployee;
        }
        return emp;
      }));
      
      // CRITICAL: Trigger auto-save after novedades refresh
      console.log('💾 Triggering auto-save after novedades refresh');
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
        deducciones: emp.deductions,
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
    isLoading: isLoading || isRecovering,
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
    // New removal status
    isRemovingEmployee,
    // Debug info
    removedEmployeeIds
  };
};
