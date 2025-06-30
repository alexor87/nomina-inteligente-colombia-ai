import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimePayroll } from '@/hooks/useRealtimePayroll';
import { PayrollLiquidationBackendService, PayrollCalculationBackendService } from '@/services/PayrollLiquidationBackendService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { PayrollPeriod } from '@/types/payroll';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { calculateEmployeeBackend, calculatePayrollSummary, convertToBaseEmployeeData } from '@/utils/payrollCalculationsBackend';

export const usePayrollLiquidationIntelligentEnhanced = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });

  // Integrar realtime para actualizaciones automáticas
  useRealtimePayroll({
    onPayrollChange: useCallback(() => {
      console.log('🔄 Detectado cambio en nómina via realtime, recargando...');
      if (currentPeriod) {
        loadEmployees();
      } else {
        initializePeriod();
      }
    }, [currentPeriod])
  });

  const initializePeriod = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Inicializando período inteligente mejorado...');
      
      let activePeriod = await PayrollPeriodService.getCurrentActivePeriod();
      
      if (!activePeriod) {
        console.log('📝 No hay período activo, creando uno nuevo...');
        
        const companySettings = await PayrollPeriodService.getCompanySettings();
        const periodicity = companySettings?.periodicity || 'mensual';
        
        const { startDate, endDate } = PayrollPeriodService.generatePeriodDates(periodicity);
        
        if (startDate && endDate) {
          activePeriod = await PayrollPeriodService.createPayrollPeriod(startDate, endDate, periodicity);
          
          if (activePeriod) {
            toast({
              title: "✅ Nuevo período creado inteligentemente",
              description: `Período ${PayrollPeriodService.formatPeriodText(startDate, endDate)} (${periodicity}) creado automáticamente`,
              className: "border-green-200 bg-green-50"
            });
          }
        }
      }
      
      if (activePeriod) {
        setCurrentPeriod(activePeriod);
        console.log('✅ Período activo cargado:', activePeriod);
      }
    } catch (error) {
      console.error('❌ Error inicializando período:', error);
      toast({
        title: "Error al inicializar período",
        description: "No se pudo crear el período de nómina. Verifica la configuración.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadEmployees = useCallback(async () => {
    if (!currentPeriod) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Cargando empleados con sistema inteligente mejorado (Backend + Novedades)...');
      const loadedEmployees = await PayrollLiquidationBackendService.loadEmployeesForLiquidation();
      console.log(`📊 Cargados ${loadedEmployees.length} empleados con novedades aplicadas`);
      
      const transformedEmployees: PayrollEmployee[] = loadedEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        position: emp.position,
        baseSalary: emp.baseSalary,
        workedDays: emp.workedDays,
        extraHours: emp.extraHours,
        disabilities: emp.disabilities,
        bonuses: emp.bonuses,
        absences: emp.absences,
        grossPay: emp.grossPay,
        deductions: emp.deductions,
        netPay: emp.netPay,
        status: emp.status,
        errors: emp.validationErrors || [],
        eps: emp.eps,
        afp: emp.afp,
        transportAllowance: emp.baseSalary <= 2600000 ? 200000 : 0,
        employerContributions: emp.employerContributions
      }));
      
      setEmployees(transformedEmployees);
      
      if (transformedEmployees.length > 0) {
        toast({
          title: "🎯 Empleados cargados inteligentemente",
          description: `${transformedEmployees.length} empleados activos con cálculos backend y novedades aplicadas`,
          className: "border-blue-200 bg-blue-50"
        });
      } else {
        toast({
          title: "⚠️ Sin empleados activos",
          description: "No se encontraron empleados activos. Agrega empleados primero.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados. Verifica la conexión.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentPeriod]);

  const deleteEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriod || currentPeriod.estado !== 'borrador') {
      toast({
        title: "❌ Período no editable",
        description: "Solo se pueden eliminar empleados en períodos en estado borrador",
        variant: "destructive"
      });
      return;
    }

    try {
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      
      toast({
        title: "🗑️ Empleado eliminado",
        description: "El empleado ha sido eliminado de la nómina",
        className: "border-orange-200 bg-orange-50"
      });
    } catch (error) {
      console.error('❌ Error eliminando empleado:', error);
      toast({
        title: "Error al eliminar empleado",
        description: "No se pudo eliminar el empleado",
        variant: "destructive"
      });
    }
  }, [currentPeriod, toast]);

  const deleteMultipleEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriod || currentPeriod.estado !== 'borrador') {
      toast({
        title: "❌ Período no editable",
        description: "Solo se pueden eliminar empleados en períodos en estado borrador",
        variant: "destructive"
      });
      return;
    }

    try {
      setEmployees(prev => prev.filter(emp => !employeeIds.includes(emp.id)));
      
      toast({
        title: "🗑️ Empleados eliminados",
        description: `Se eliminaron ${employeeIds.length} empleados de la nómina`,
        className: "border-orange-200 bg-orange-50"
      });
    } catch (error) {
      console.error('❌ Error eliminando empleados:', error);
      toast({
        title: "Error al eliminar empleados",
        description: "No se pudieron eliminar los empleados",
        variant: "destructive"
      });
    }
  }, [currentPeriod, toast]);

  useEffect(() => {
    initializePeriod();
  }, [initializePeriod]);

  useEffect(() => {
    if (currentPeriod) {
      loadEmployees();
    }
  }, [loadEmployees, currentPeriod]);

  useEffect(() => {
    setSummary(calculatePayrollSummary(employees));
  }, [employees]);

  const updateEmployee = useCallback(async (id: string, field: string, value: number) => {
    if (!currentPeriod || currentPeriod.estado !== 'borrador') {
      toast({
        title: "❌ Período no editable",
        description: "Solo se pueden hacer cambios en períodos en estado borrador",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      setEmployees(prev => prev.map(emp => {
        if (emp.id === id) {
          return { ...emp, [field]: value, status: 'incomplete' as const };
        }
        return emp;
      }));

      const employeeToUpdate = employees.find(emp => emp.id === id);
      if (employeeToUpdate) {
        const updated = convertToBaseEmployeeData(employeeToUpdate);
        const updatedWithNewValue = { ...updated, [field]: value };
        const recalculatedEmployee = await calculateEmployeeBackend(
          updatedWithNewValue, 
          currentPeriod.tipo_periodo as 'quincenal' | 'mensual'
        );

        setEmployees(prev => prev.map(emp => 
          emp.id === id ? recalculatedEmployee : emp
        ));
      }
    } catch (error) {
      console.error('❌ Error actualizando empleado:', error);
      toast({
        title: "Error al actualizar empleado",
        description: "No se pudo recalcular los datos del empleado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod, employees, toast]);

  const updatePeriod = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriod || currentPeriod.estado !== 'borrador') {
      toast({
        title: "❌ Período no editable",
        description: "Solo se pueden cambiar las fechas en períodos en estado borrador",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const validation = PayrollPeriodService.validatePeriod(startDate, endDate);
      
      if (!validation.isValid) {
        toast({
          title: "❌ Fechas inválidas",
          description: validation.warnings.join(', '),
          variant: "destructive"
        });
        return;
      }

      const updatedPeriod = await PayrollPeriodService.updatePayrollPeriod(currentPeriod.id, {
        fecha_inicio: startDate,
        fecha_fin: endDate
      });

      if (updatedPeriod) {
        setCurrentPeriod(updatedPeriod);
        
        toast({
          title: "✅ Período actualizado inteligentemente",
          description: `Nuevo período: ${PayrollPeriodService.formatPeriodText(startDate, endDate)}`,
          className: "border-green-200 bg-green-50"
        });

        const recalculatedEmployees = await Promise.all(
          employees.map(async (emp) => {
            const baseData = convertToBaseEmployeeData(emp);
            return await calculateEmployeeBackend(baseData, updatedPeriod.tipo_periodo as 'quincenal' | 'mensual');
          })
        );
        setEmployees(recalculatedEmployees);
      }
    } catch (error) {
      console.error('❌ Error actualizando período:', error);
      toast({
        title: "Error al actualizar período",
        description: "No se pudo actualizar el período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod, employees, toast]);

  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;

    setIsLoading(true);
    toast({
      title: "🔄 Recalculando nómina inteligentemente",
      description: "Aplicando configuración legal actualizada y novedades usando backend...",
      className: "border-blue-200 bg-blue-50"
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const recalculatedEmployees = await PayrollLiquidationBackendService.loadEmployeesForLiquidation();
      
      const transformedEmployees: PayrollEmployee[] = recalculatedEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        position: emp.position,
        baseSalary: emp.baseSalary,
        workedDays: emp.workedDays,
        extraHours: emp.extraHours,
        disabilities: emp.disabilities,
        bonuses: emp.bonuses,
        absences: emp.absences,
        grossPay: emp.grossPay,
        deductions: emp.deductions,
        netPay: emp.netPay,
        status: emp.status,
        errors: emp.validationErrors || [],
        eps: emp.eps,
        afp: emp.afp,
        transportAllowance: emp.baseSalary <= 2600000 ? 200000 : 0,
        employerContributions: emp.employerContributions
      }));
      
      setEmployees(transformedEmployees);

      toast({
        title: "✅ Recálculo completado inteligentemente",
        description: "Todos los cálculos han sido actualizados con las novedades más recientes.",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('❌ Error en recálculo:', error);
      toast({
        title: "Error en recálculo",
        description: "No se pudo completar el recálculo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentPeriod]);

  const approvePeriod = useCallback(async () => {
    if (!currentPeriod) return;

    const invalidEmployees = employees.filter(emp => emp.status !== 'valid');
    if (invalidEmployees.length > 0) {
      toast({
        title: "❌ No se puede aprobar",
        description: `Corrige los errores en ${invalidEmployees.length} empleado(s) antes de aprobar.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: "🔄 Aprobando período inteligentemente",
      description: "Guardando nómina y generando comprobantes automáticamente...",
      className: "border-blue-200 bg-blue-50"
    });

    try {
      const liquidationData = {
        period: {
          id: currentPeriod.id,
          startDate: currentPeriod.fecha_inicio,
          endDate: currentPeriod.fecha_fin,
          status: 'approved' as const,
          type: currentPeriod.tipo_periodo as 'quincenal' | 'mensual'
        },
        employees
      };

      const message = await PayrollLiquidationBackendService.savePayrollLiquidation(liquidationData);
      
      const updatedPeriod = await PayrollPeriodService.updatePayrollPeriod(currentPeriod.id, {
        estado: 'aprobado'
      });

      if (updatedPeriod) {
        setCurrentPeriod(updatedPeriod);
      }

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(amount);
      };
      
      toast({
        title: "🎉 Período aprobado y cerrado inteligentemente",
        description: `${employees.length} empleados procesados • ${formatCurrency(summary.totalNetPay)} • Comprobantes generados automáticamente`,
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('❌ Error aprobando período:', error);
      toast({
        title: "Error al aprobar",
        description: error instanceof Error ? error.message : "No se pudo aprobar el período.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, employees, currentPeriod, summary.totalNetPay]);

  const isValid = employees.every(emp => emp.status === 'valid') && employees.length > 0;
  const canEdit = currentPeriod?.estado === 'borrador';

  return {
    currentPeriod,
    employees,
    summary,
    isValid,
    isLoading,
    canEdit,
    isEditingPeriod,
    setIsEditingPeriod,
    updateEmployee,
    updatePeriod,
    recalculateAll,
    approvePeriod,
    refreshEmployees: loadEmployees,
    deleteEmployee,
    deleteMultipleEmployees
  };
};
