import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollPeriodService, PayrollPeriod as DBPayrollPeriod } from '@/services/PayrollPeriodService';
import { PayrollCalculationService } from '@/services/PayrollCalculationService';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { calculateEmployee, calculatePayrollSummary, convertToBaseEmployeeData } from '@/utils/payrollCalculations';

export const usePayrollLiquidation = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<DBPayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [isReopenedPeriod, setIsReopenedPeriod] = useState(false);
  const [reopenedBy, setReopenedBy] = useState<string | null>(null);
  const [reopenedAt, setReopenedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });

  // Inicializar período al cargar - PRIORIZAR PERÍODOS ESPECÍFICOS Y REABIERTOS
  const initializePeriod = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Initializing payroll period - checking for specific period first...');
      
      // PASO 1: Verificar si hay un período específico para continuar editando
      const continueEditingData = sessionStorage.getItem('continueEditingPeriod');
      if (continueEditingData) {
        try {
          const periodInfo = JSON.parse(continueEditingData);
          console.log('📋 Found specific period to continue editing:', periodInfo);
          
          // Usar directamente las fechas del sessionStorage
          const specificPeriod: DBPayrollPeriod = {
            id: periodInfo.id,
            company_id: '', // Se llenará después
            fecha_inicio: periodInfo.startDate,
            fecha_fin: periodInfo.endDate,
            tipo_periodo: periodInfo.type === 'mensual' ? 'mensual' : 'quincenal',
            estado: 'borrador', // Siempre borrador si está reabierto
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            modificado_por: periodInfo.reopenedBy || null,
            modificado_en: periodInfo.reopenedAt || null
          };

          console.log('✅ Created period object with exact dates:', {
            id: specificPeriod.id,
            startDate: specificPeriod.fecha_inicio,
            endDate: specificPeriod.fecha_fin,
            type: specificPeriod.tipo_periodo
          });
          
          setCurrentPeriod(specificPeriod);
          setIsReopenedPeriod(true);
          setReopenedBy(periodInfo.reopenedBy || null);
          setReopenedAt(periodInfo.reopenedAt || null);
          
          // Limpiar sessionStorage después del uso exitoso
          sessionStorage.removeItem('continueEditingPeriod');
          
          toast({
            title: "Período específico cargado",
            description: `Continuando edición del período ${periodInfo.periodo}`,
            duration: 4000,
          });
          
          return; // Salir temprano con el período correcto
        } catch (error) {
          console.error('❌ Error parsing continue editing period:', error);
          sessionStorage.removeItem('continueEditingPeriod');
        }
      }
      
      // PASO 2: Buscar períodos reabiertos en general (solo si no hay período específico)
      console.log('🔍 No specific period found, checking for general reopened periods...');
      const payrollHistory = await PayrollHistoryService.getPayrollPeriods();
      const reopenedPeriods = payrollHistory.filter(p => p.reabierto_por);
      
      if (reopenedPeriods.length > 0) {
        console.log('🔓 Found reopened periods:', reopenedPeriods.length);
        
        // Tomar el más reciente
        const latestReopened = reopenedPeriods[0];
        
        // Crear un período compatible para trabajar
        const reopenedPeriod: DBPayrollPeriod = {
          id: latestReopened.id,
          company_id: latestReopened.companyId,
          fecha_inicio: latestReopened.fecha_inicio!,
          fecha_fin: latestReopened.fecha_fin!,
          tipo_periodo: 'mensual', // Asumir mensual por defecto
          estado: 'borrador', // Siempre borrador si está reabierto
          created_at: latestReopened.fechaCreacion,
          updated_at: new Date().toISOString(),
          modificado_por: latestReopened.reabierto_por || null,
          modificado_en: latestReopened.fecha_reapertura || null
        };
        
        setCurrentPeriod(reopenedPeriod);
        setIsReopenedPeriod(true);
        setReopenedBy(latestReopened.reabierto_por || null);
        setReopenedAt(latestReopened.fecha_reapertura || null);
        
        toast({
          title: "Período reabierto cargado",
          description: `Continuando edición del período ${latestReopened.periodo}`,
          duration: 4000,
        });
        
        return; // Salir temprano, no crear nuevo período
      }
      
      // PASO 3: Buscar período activo existente (solo si no hay reabiertos)
      console.log('📅 No reopened periods found, checking for active period...');
      let activePeriod = await PayrollPeriodService.getCurrentActivePeriod();
      
      if (!activePeriod) {
        // No hay período activo, crear uno nuevo basado en configuración
        console.log('🆕 No active period found, creating new one...');
        
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
            console.warn('⚠️ Could not create payroll period - no company ID available');
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
        setIsReopenedPeriod(false);
        setReopenedBy(null);
        setReopenedAt(null);
        console.log('✅ Active period loaded:', activePeriod);
      }
    } catch (error) {
      console.error('❌ Error initializing period:', error);
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

  // Recalcular todos los empleados con configuración actualizada
  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;

    setIsLoading(true);
    toast({
      title: "Recalculando nómina",
      description: "Aplicando configuración legal actualizada a todos los empleados..."
    });

    try {
      // Forzar actualización de la configuración antes de recalcular
      PayrollCalculationService.updateConfiguration('2025');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEmployees(prev => prev.map(emp => {
        const baseData = convertToBaseEmployeeData(emp);
        return calculateEmployee(baseData, currentPeriod.tipo_periodo as 'quincenal' | 'mensual');
      }));

      toast({
        title: "Recálculo completado",
        description: "Todos los cálculos han sido actualizados con los parámetros legales más recientes."
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

  // FUNCIÓN MEJORADA: Finalizar edición de período reabierto
  const finishReopenedPeriodEditing = useCallback(async () => {
    if (!currentPeriod || !isReopenedPeriod) return;

    setIsLoading(true);
    try {
      // Cerrar el período nuevamente usando el período completo en formato correcto
      const periodText = `${currentPeriod.fecha_inicio} - ${currentPeriod.fecha_fin}`;
      await PayrollHistoryService.reopenPeriod(periodText);
      
      toast({
        title: "Período cerrado exitosamente",
        description: "El período ha sido cerrado y guardado correctamente.",
      });

      // Reinicializar para buscar el siguiente período disponible
      setTimeout(() => {
        initializePeriod();
      }, 1000);

    } catch (error) {
      console.error('Error finishing reopened period editing:', error);
      toast({
        title: "Error al cerrar período",
        description: "No se pudo cerrar el período correctamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod, isReopenedPeriod, toast, initializePeriod]);

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
    isReopenedPeriod,
    reopenedBy,
    reopenedAt,
    updateEmployee,
    updatePeriod,
    recalculateAll,
    approvePeriod,
    finishReopenedPeriodEditing,
    refreshEmployees: loadEmployees
  };
};
