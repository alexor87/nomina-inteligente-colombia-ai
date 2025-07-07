import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollAutoSaveService } from '@/services/PayrollAutoSaveService';
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
  // Deducciones detalladas para auditoría DIAN/UGPP
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
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isRecovering, setIsRecovering] = useState(false);
  const { toast } = useToast();

  // Auto-save integration
  const { triggerAutoSave, isSaving, lastSaveTime } = usePayrollAutoSave({
    periodId: currentPeriodId,
    employees,
    enabled: true
  });

  // Check for active period on mount
  useEffect(() => {
    checkForActivePeriod();
  }, []);

  const checkForActivePeriod = async () => {
    try {
      const activePeriod = await PayrollAutoSaveService.getActivePeriod();
      
      if (activePeriod && activePeriod.employees_count > 0) {
        console.log('📋 Found active period:', activePeriod);
        
        // Show recovery option
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
      console.log('🔄 Recovering active period:', activePeriod.id);
      
      // Set period info
      setCurrentPeriodId(activePeriod.id);
      setStartDate(activePeriod.fecha_inicio);
      setEndDate(activePeriod.fecha_fin);
      
      // Load draft employees
      const draftEmployees = await PayrollAutoSaveService.loadDraftEmployees(activePeriod.id);
      
      // Load and recalculate novedades for each employee
      const employeesWithNovedades = await Promise.all(
        draftEmployees.map(async (employee) => {
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

  // Transform DB employee to PayrollEmployee
  const transformEmployee = (dbEmployee: DBEmployee): PayrollEmployee => ({
    id: dbEmployee.id,
    name: `${dbEmployee.nombre} ${dbEmployee.apellido}`,
    position: 'Empleado', // Default position, could be enhanced later
    baseSalary: dbEmployee.salario_base,
    workedDays: dbEmployee.dias_trabajados,
    extraHours: 0, // Will be calculated from novedades
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
    try {
      console.log('🔄 usePayrollLiquidation - Loading employees for period:', { startDate, endDate });
      
      const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate);
      
      // Create or get period for novedades
      const periodId = await PayrollLiquidationService.ensurePeriodExists(startDate, endDate);
      setCurrentPeriodId(periodId);
      
      console.log('📋 usePayrollLiquidation - Period ID set:', periodId);
      
      // Load novedades for each employee
      const employeesWithNovedades = await Promise.all(
        employeesData.map(async (employee) => {
          console.log(`🔄 usePayrollLiquidation - Loading novedades for employee: ${employee.nombre}`);
          
          const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
            employee.id,
            periodId
          );
          
          console.log(`📊 usePayrollLiquidation - Novedades totals for ${employee.nombre}:`, novedadesTotals);
          
          // Preservar las deducciones de ley calculadas y sumar las de novedades
          const totalDeducciones = employee.salud_empleado + employee.pension_empleado + 
                                 employee.fondo_solidaridad + employee.retencion_fuente + 
                                 novedadesTotals.totalDeducciones;
          
          // Recalculate total_pagar with detailed deductions
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
      
      // Transform to PayrollEmployee format
      const transformedEmployees = employeesWithNovedades.map(transformEmployee);
      setEmployees(transformedEmployees);
      
      // Trigger auto-save after loading
      setTimeout(() => triggerAutoSave(), 1000);
      
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

  const addEmployees = async (employeeIds: string[]) => {
    if (!currentPeriodId || !startDate || !endDate) {
      console.warn('⚠️ usePayrollLiquidation - Missing period info when adding employees');
      throw new Error('No hay información del período activo');
    }

    console.log('🔄 usePayrollLiquidation - Adding employees:', employeeIds);
    
    try {
      // Load the specific employees to add
      const newEmployeesData = await PayrollLiquidationService.loadSpecificEmployeesForPeriod(
        employeeIds, 
        startDate, 
        endDate
      );

      // Process each new employee with novedades
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

      // Transform and add to existing employees
      const transformedNewEmployees = processedNewEmployees.map(transformEmployee);
      setEmployees(prev => [...prev, ...transformedNewEmployees]);
      
      // Trigger auto-save after adding
      setTimeout(() => triggerAutoSave(), 500);
      
      console.log('✅ usePayrollLiquidation - Employees added successfully:', transformedNewEmployees.length);
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error adding employees:', error);
      throw error;
    }
  };

  const removeEmployee = (employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    
    // Trigger auto-save after removing
    setTimeout(() => triggerAutoSave(), 500);
    
    toast({
      title: "Empleado removido",
      description: "El empleado ha sido removido de esta liquidación",
    });
  };

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
      
      console.log('✅ usePayrollLiquidation - Employee novedades refreshed successfully');
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error refreshing employee novedades:', error);
    }
  };

  const liquidatePayroll = async (startDate: string, endDate: string) => {
    setIsLiquidating(true);
    try {
      // Convert PayrollEmployee back to expected format for service
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
      // Update employee salary in the state
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
    triggerManualSave: triggerAutoSave
  };
};
