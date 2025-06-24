
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollPeriodService, PayrollPeriod as DBPayrollPeriod } from '@/services/PayrollPeriodService';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { calculateEmployee, calculatePayrollSummary, convertToBaseEmployeeData } from '@/utils/payrollCalculations';

export const usePayrollLiquidation = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<DBPayrollPeriod | null>(null);
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

  // Inicializar período al cargar
  const initializePeriod = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Initializing payroll period...');
      
      // Buscar período activo existente
      let activePeriod = await PayrollPeriodService.getCurrentActivePeriod();
      
      if (!activePeriod) {
        // No hay período activo, crear uno nuevo basado en configuración
        console.log('No active period found, creating new one...');
        
        const companySettings = await PayrollPeriodService.getCompanySettings();
        const periodicity = companySettings?.periodicity || 'mensual';
        
        const { startDate, endDate } = PayrollPeriodService.generatePeriodDates(periodicity);
        
        if (startDate && endDate) {
          activePeriod = await PayrollPeriodService.createPayrollPeriod(startDate, endDate, periodicity);
          
          if (activePeriod) {
            toast({
              title: "Nuevo período creado",
              description: `Período ${PayrollPeriodService.formatPeriodText(startDate, endDate)} creado automáticamente`
            });
          } else {
            console.warn('Could not create payroll period - no company ID available');
            toast({
              title: "Configuración requerida",
              description: "Para usar este módulo, necesitas tener una empresa asignada a tu usuario.",
              variant: "destructive"
            });
          }
        }
      }
      
      if (activePeriod) {
        setCurrentPeriod(activePeriod);
        console.log('Active period loaded:', activePeriod);
      }
    } catch (error) {
      console.error('Error initializing period:', error);
      toast({
        title: "Error al inicializar período",
        description: "No se pudo crear el período de nómina. Verifica la configuración.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Cargar empleados desde la base de datos
  const loadEmployees = useCallback(async () => {
    if (!currentPeriod) return;
    
    setIsLoading(true);
    try {
      console.log('Loading active employees for payroll liquidation...');
      const loadedEmployees = await PayrollLiquidationService.loadEmployeesForLiquidation();
      console.log(`Loaded ${loadedEmployees.length} active employees for payroll:`, loadedEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        status: emp.status
      })));
      
      setEmployees(loadedEmployees);
      
      if (loadedEmployees.length > 0) {
        toast({
          title: "Empleados cargados",
          description: `Se cargaron ${loadedEmployees.length} empleados activos para liquidación`
        });
      } else {
        toast({
          title: "Sin empleados activos",
          description: "No se encontraron empleados activos. Agrega empleados en el módulo de Empleados primero.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados. Verifica la conexión a la base de datos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentPeriod]);

  // Cargar período y empleados al montar el componente
  useEffect(() => {
    initializePeriod();
  }, [initializePeriod]);

  useEffect(() => {
    if (currentPeriod) {
      loadEmployees();
    }
  }, [loadEmployees, currentPeriod]);

  // Actualizar resumen cuando cambien los empleados
  useEffect(() => {
    setSummary(calculatePayrollSummary(employees));
  }, [employees]);

  // Actualizar empleado
  const updateEmployee = useCallback(async (id: string, field: string, value: number) => {
    if (!currentPeriod || currentPeriod.estado !== 'borrador') {
      toast({
        title: "Período no editable",
        description: "Solo se pueden hacer cambios en períodos en estado borrador",
        variant: "destructive"
      });
      return;
    }

    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const updated = convertToBaseEmployeeData(emp);
        const updatedWithNewValue = { ...updated, [field]: value };
        return calculateEmployee(updatedWithNewValue, currentPeriod.tipo_periodo as 'quincenal' | 'mensual');
      }
      return emp;
    }));
  }, [currentPeriod, toast]);

  // Actualizar período
  const updatePeriod = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriod || currentPeriod.estado !== 'borrador') {
      toast({
        title: "Período no editable",
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
          title: "Fechas inválidas",
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
        
        // Mostrar advertencias si las hay
        if (validation.warnings.length > 0) {
          toast({
            title: "Período actualizado con advertencias",
            description: validation.warnings.join(', '),
            variant: "default"
          });
        } else {
          toast({
            title: "Período actualizado",
            description: `Nuevo período: ${PayrollPeriodService.formatPeriodText(startDate, endDate)}`
          });
        }

        // Recalcular empleados con el nuevo período
        setEmployees(prev => prev.map(emp => {
          const baseData = convertToBaseEmployeeData(emp);
          return calculateEmployee(baseData, updatedPeriod.tipo_periodo as 'quincenal' | 'mensual');
        }));
      }
    } catch (error) {
      console.error('Error updating period:', error);
      toast({
        title: "Error al actualizar período",
        description: "No se pudo actualizar el período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod, toast]);

  // Recalcular todos los empleados
  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;

    setIsLoading(true);
    toast({
      title: "Recalculando nómina",
      description: "Aplicando configuración actual a todos los empleados..."
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEmployees(prev => prev.map(emp => {
        const baseData = convertToBaseEmployeeData(emp);
        return calculateEmployee(baseData, currentPeriod.tipo_periodo as 'quincenal' | 'mensual');
      }));

      toast({
        title: "Recálculo completado",
        description: "Todos los cálculos han sido actualizados exitosamente."
      });
    } catch (error) {
      toast({
        title: "Error en recálculo",
        description: "No se pudo completar el recálculo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentPeriod]);

  // Aprobar período y guardar en base de datos
  const approvePeriod = useCallback(async () => {
    if (!currentPeriod) return;

    const invalidEmployees = employees.filter(emp => emp.status !== 'valid');
    if (invalidEmployees.length > 0) {
      toast({
        title: "No se puede aprobar",
        description: `Corrige los errores en ${invalidEmployees.length} empleado(s) antes de aprobar.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: "Aprobando período",
      description: "Guardando nómina y generando comprobantes..."
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

      const message = await PayrollLiquidationService.savePayrollLiquidation(liquidationData);
      
      // Actualizar estado del período a aprobado
      const updatedPeriod = await PayrollPeriodService.updatePayrollPeriod(currentPeriod.id, {
        estado: 'aprobado'
      });

      if (updatedPeriod) {
        setCurrentPeriod(updatedPeriod);
      }
      
      toast({
        title: "¡Período aprobado!",
        description: message
      });
    } catch (error) {
      console.error('Error approving period:', error);
      toast({
        title: "Error al aprobar",
        description: error instanceof Error ? error.message : "No se pudo aprobar el período.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, employees, currentPeriod]);

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
    refreshEmployees: loadEmployees
  };
};
