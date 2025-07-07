import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollAutoSaveService } from '@/services/PayrollAutoSaveService';
import { PayrollDeletionService } from '@/services/PayrollDeletionService';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';
import { PayrollEmployee } from '@/types/payroll';
import { usePayrollAutoSave } from './usePayrollAutoSave';
import { usePayrollIntelligentLoad } from './usePayrollIntelligentLoad';

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

  // Intelligent load hook
  const { intelligentLoad, isLoading: isIntelligentLoading } = usePayrollIntelligentLoad();

  // Auto-save integration
  const { triggerAutoSave, isSaving, lastSaveTime } = usePayrollAutoSave({
    periodId: currentPeriodId,
    employees,
    removedEmployeeIds,
    enabled: true,
    onSaveSuccess: () => {
      console.log('✅ Auto-save success callback - clearing removed employee IDs');
      setRemovedEmployeeIds([]);
    }
  });

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
      
      console.log('✅ usePayrollLiquidation - Employees added successfully:', transformedNewEmployees.length);
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error adding employees:', error);
      throw error;
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
    isLoading: isLoading || isRecovering || isIntelligentLoading,
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
