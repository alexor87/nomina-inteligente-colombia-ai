import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PayrollService } from '@/services/PayrollService';
import { EmployeeService } from '@/services/EmployeeService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { supabase } from '@/integrations/supabase/client';
import { BaseEmployeeData, PayrollEmployee } from '@/types/payroll';
import { usePayrollNovedadesUnified } from './usePayrollNovedadesUnified';
import { useVacationIntegration } from './useVacationIntegration';

export const usePayrollUnified = (companyId?: string) => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const payrollNovedades = usePayrollNovedadesUnified(currentPeriodId || '');
  const vacationIntegration = useVacationIntegration();

  // ✅ Auto-save interval (e.g., every 60 seconds)
  const AUTO_SAVE_INTERVAL = 60000;

  // ✅ Function to trigger auto-save
  const triggerAutoSave = useCallback(async () => {
    if (employees.length === 0 || !currentPeriodId) return;

    setIsAutoSaving(true);
    try {
      console.log('💾 Auto-saving payroll data...');
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      const { error } = await supabase
        .from('payrolls')
        .upsert(employees.map(emp => ({
          employee_id: emp.id,
          period_id: currentPeriodId,
          company_id: companyId,
          periodo: currentPeriodId, // Required field
          salario_base: emp.baseSalary,
          total_devengado: emp.grossPay,
          total_deducciones: emp.deductions,
          neto_pagado: emp.netPay,
          estado: 'borrador'
        })));
      
      if (error) throw error;
      setLastAutoSaveTime(new Date());
      toast({
        title: "💾 Auto Guardado",
        description: "Los datos de la nómina se guardaron automáticamente",
        duration: 2000,
      });
    } catch (error) {
      console.error('❌ Error auto-saving payroll data:', error);
      toast({
        title: "❌ Error al guardar",
        description: "No se pudieron guardar los datos automáticamente",
        variant: "destructive",
      });
    } finally {
      setIsAutoSaving(false);
    }
  }, [employees, currentPeriodId, toast]);

  // ✅ Set up auto-save interval
  useEffect(() => {
    const intervalId = setInterval(triggerAutoSave, AUTO_SAVE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [triggerAutoSave]);

  // ✅ Function to create or continue a payroll period
  const createOrContinuePeriod = useCallback(async (startDate: string, endDate: string) => {
    if (!companyId) {
      return { success: false, message: 'Company ID is required', periodId: null };
    }

    try {
      console.log('🗓️ Creating or resuming payroll period...', { startDate, endDate });
      const period = await PayrollPeriodService.createPayrollPeriod(startDate, endDate, 'mensual');
      if (!period) {
        throw new Error('Failed to create payroll period');
      }

      setCurrentPeriodId(period.id);
      return { success: true, message: 'Payroll period created/resumed', periodId: period.id };
    } catch (error) {
      console.error('❌ Error creating/resuming payroll period:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error creando/continuando período de nómina',
        variant: "destructive",
      });
      return { success: false, message: error instanceof Error ? error.message : 'Error creating/resuming period', periodId: null };
    }
  }, [companyId, toast]);

  // ✅ Function to load employees for the payroll
  const loadEmployees = useCallback(async (startDate: string, endDate: string) => {
    if (!companyId || isLoading) return;

    setIsLoading(true);
    try {
      console.log('👥 Loading employees for period:', { startDate, endDate });

      // 1. Crear/obtener período activo
      const periodResult = await createOrContinuePeriod(startDate, endDate);
      if (!periodResult.success) {
        throw new Error(periodResult.message);
      }

      // 2. Obtener empleados de la empresa
      const employeesResult = await EmployeeService.getEmployees();
      if (!employeesResult.success) {
        throw new Error(employeesResult.error || 'Error loading employees');
      }
      const baseEmployees = employeesResult.data || [];
      console.log(`✅ Found ${baseEmployees.length} employees`);

      // 3. Cargar datos de nómina existentes (si existen)
      const { data: existingPayrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', periodResult.periodId);
      
      if (payrollError) {
        console.error('Error loading payroll data:', payrollError);
      }
      console.log(`✅ Found existing payroll data for ${existingPayrollData?.length || 0} employees`);

      // 4. Combinar datos base con datos de nómina existentes
      const payrollEmployees = baseEmployees.map(baseEmp => {
        const existingData = existingPayrollData?.find(data => data.employee_id === baseEmp.id);
        return {
          id: baseEmp.id,
          name: `${baseEmp.nombre} ${baseEmp.apellido}`,
          position: baseEmp.cargo || 'Sin cargo',
          baseSalary: baseEmp.salarioBase || 0,
          workedDays: baseEmp.diasTrabajo || 30,
          extraHours: 0,
          disabilities: 0,
          bonuses: 0,
          absences: 0,
          grossPay: existingData?.total_devengado || 0,
          deductions: existingData?.total_deducciones || 0,
          netPay: existingData?.neto_pagado || 0,
          status: 'valid' as 'valid' | 'error' | 'incomplete',
          errors: [],
          eps: baseEmp.eps || '',
          afp: baseEmp.afp || '',
          transportAllowance: 0,
          employerContributions: 0,
          ibc: baseEmp.salarioBase || 0,
          novedades: []
        };
      });

      // 5. Cargar totales de novedades
      await payrollNovedades.loadNovedadesTotals(payrollEmployees.map(emp => emp.id));

      // 6. Establecer empleados
      setEmployees(payrollEmployees);

    } catch (error) {
      console.error('❌ Error loading employees:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error cargando empleados',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, isLoading, createOrContinuePeriod, toast, payrollNovedades]);

  // ✅ Function to add employees to the payroll
  const addEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriodId) {
      toast({
        title: "❌ Error",
        description: "No hay período activo",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('➕ Adding employees to payroll:', employeeIds);

      // 1. Obtener datos base de los empleados
      const employeePromises = employeeIds.map(id => EmployeeService.getEmployeeById(id));
      const employeeResults = await Promise.all(employeePromises);
      const newEmployees = employeeResults.filter(Boolean);

      // 2. Mapear a tipo PayrollEmployee
      const payrollEmployees: PayrollEmployee[] = newEmployees.map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`,
        position: emp.cargo || 'Sin cargo',
        baseSalary: emp.salarioBase || 0,
        workedDays: emp.diasTrabajo || 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: 0,
        deductions: 0,
        netPay: 0,
        status: 'valid',
        errors: [],
        eps: emp.eps || '',
        afp: emp.afp || '',
        transportAllowance: 0,
        employerContributions: 0,
        ibc: emp.salarioBase || 0,
        novedades: []
      }));

      // 3. Combinar con empleados existentes
      const updatedEmployees = [...employees, ...payrollEmployees];
      setEmployees(updatedEmployees);

      // 4. Invalidar cache y recalcular totales
      payrollNovedades.refreshAllEmployees(updatedEmployees.map(emp => emp.id));

      toast({
        title: "✅ Empleados agregados",
        description: `Se agregaron ${employeeIds.length} empleados a la nómina`,
        className: "border-green-200 bg-green-50"
      });

    } catch (error) {
      console.error('❌ Error adding employees:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error agregando empleados',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [employees, payrollNovedades, toast]);

  // ✅ Function to remove an employee from the payroll
  const removeEmployee = useCallback(async (employeeId: string) => {
    setIsRemovingEmployee(true);
    try {
      console.log('🗑️ Removing employee from payroll:', employeeId);
      const updatedEmployees = employees.filter(emp => emp.id !== employeeId);
      setEmployees(updatedEmployees);

      // ✅ Invalidate cache and recalculate totals
      payrollNovedades.refreshAllEmployees(updatedEmployees.map(emp => emp.id));

      toast({
        title: "✅ Empleado removido",
        description: "El empleado se removió de la nómina",
        className: "border-orange-200 bg-orange-50"
      });
    } catch (error) {
      console.error('❌ Error removing employee:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error removiendo empleado',
        variant: "destructive",
      });
    } finally {
      setIsRemovingEmployee(false);
    }
  }, [employees, payrollNovedades, toast]);

  // ✅ Function to liquidate the payroll
  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriodId) {
      toast({
        title: "❌ Error",
        description: "No hay período activo",
        variant: "destructive",
      });
      return;
    }

    setIsLiquidating(true);
    try {
      console.log('💰 Liquidating payroll for period:', { startDate, endDate });
      
      // Process payroll liquidation using available methods
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      const payrollCalculations = employees.map(employee => {
        // Create a complete PayrollCalculation object
        const baseCalculation = {
          salarioBase: employee.baseSalary || 0,
          diasTrabajados: employee.workedDays || 30,
          horasExtra: employee.extraHours || 0,
          recargoNocturno: 0,
          recargoDominical: 0,
          bonificaciones: employee.bonuses || 0,
          auxilioTransporte: 0,
          totalDevengado: 0,
          saludEmpleado: 0,
          pensionEmpleado: 0,
          retencionFuente: 0,
          otrasDeducciones: 0,
          totalDeducciones: 0,
          netoPagado: 0,
          cesantias: 0,
          interesesCesantias: 0,
          prima: 0,
          vacaciones: 0
        };
        
        return PayrollService.calculatePayroll(baseCalculation);
      });

      // Save calculated payrolls
      const { error: saveError } = await supabase
        .from('payrolls')
        .upsert(employees.map((employee, index) => ({
          employee_id: employee.id,
          period_id: currentPeriodId,
          company_id: companyId,
          periodo: currentPeriodId, // Required field
          salario_base: employee.baseSalary,
          dias_trabajados: employee.workedDays,
          total_devengado: payrollCalculations[index].totalDevengado,
          total_deducciones: payrollCalculations[index].totalDeducciones,
          neto_pagado: payrollCalculations[index].netoPagado,
          estado: 'liquidada'
        })));

      if (saveError) throw saveError;

      toast({
        title: "✅ Nómina liquidada",
        description: "La nómina se liquidó correctamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('❌ Error liquidating payroll:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error liquidando nómina',
        variant: "destructive",
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [employees, toast]);

  // ✅ Function to refresh employee novedades
  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!currentPeriodId) {
      toast({
        title: "❌ Error",
        description: "No hay período activo",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔄 Refreshing novedades for employee:', employeeId);
      await payrollNovedades.refreshEmployeeNovedades(employeeId);
    } catch (error) {
      console.error('❌ Error refreshing employee novedades:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error refrescando novedades del empleado',
        variant: "destructive",
      });
    }
  }, [toast, payrollNovedades]);

  /**
   * ✅ NUEVO MÉTODO: Cargar empleados con integración automática de vacaciones
   */
  const loadEmployeesWithVacations = useCallback(async (startDate: string, endDate: string) => {
    if (!companyId || isLoading) return;

    setIsLoading(true);
    try {
      console.log('👥 Loading employees with vacation integration for period:', { startDate, endDate });

      // 1. Crear/obtener período activo
      const periodResult = await createOrContinuePeriod(startDate, endDate);
      if (!periodResult.success) {
        throw new Error(periodResult.message);
      }

      // 2. Cargar empleados base
      await loadEmployees(startDate, endDate);

      // 3. ✅ INTEGRAR VACACIONES AUTOMÁTICAMENTE
      const integrationResult = await vacationIntegration.processVacationsForPayroll({
        periodId: currentPeriodId || periodResult.periodId,
        companyId,
        startDate,
        endDate,
        forceProcess: false
      });

      console.log('✅ Vacation integration result:', integrationResult);

      if (integrationResult.success && integrationResult.processedVacations > 0) {
        toast({
          title: "✅ Integración Completada",
          description: `Se integraron ${integrationResult.processedVacations} ausencias automáticamente`,
          className: "border-green-200 bg-green-50"
        });
        
        // Refrescar datos después de la integración
        await refreshEmployeeData();
      }

    } catch (error) {
      console.error('❌ Error loading employees with vacations:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error cargando empleados con vacaciones',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, isLoading, loadEmployees, createOrContinuePeriod, currentPeriodId, vacationIntegration, toast]);

  /**
   * ✅ MÉTODO HELPER: Refrescar datos de empleados después de cambios
   */
  const refreshEmployeeData = useCallback(async () => {
    if (!currentPeriodId) return;

    try {
      console.log('🔄 Refreshing employee data after integration');
      
      // Invalidar caches
      payrollNovedades.refreshAllEmployees(employees.map(emp => emp.id));
      
      // Recalcular totales
      const updatedEmployees = employees.map(employee => ({
        ...employee,
        // Los totales se actualizarán automáticamente via los hooks
      }));
      
      setEmployees(updatedEmployees);
      
    } catch (error) {
      console.error('❌ Error refreshing employee data:', error);
    }
  }, [currentPeriodId, employees, payrollNovedades]);

  return {
    employees,
    isLoading,
    isLiquidating,
    currentPeriodId,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    isAutoSaving,
    lastAutoSaveTime,
    isRemovingEmployee,
    
    // ✅ NUEVO: Método con integración automática
    loadEmployeesWithVacations,
    refreshEmployeeData,
  };
};
