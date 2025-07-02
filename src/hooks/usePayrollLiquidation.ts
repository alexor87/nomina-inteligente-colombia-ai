import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { PayrollCalculationService } from '@/services/PayrollCalculationService';
import { PayrollEmployee, PayrollSummary, PayrollPeriod } from '@/types/payroll';
import { calculateEmployee, calculatePayrollSummary, convertToBaseEmployeeData } from '@/utils/payrollCalculations';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { supabase } from '@/integrations/supabase/client';
import { usePayrollNovedades } from './usePayrollNovedades';

// Helper function to convert database period to PayrollPeriod interface
const convertToPayrollPeriod = (dbPeriod: any): PayrollPeriod => {
  return {
    id: dbPeriod.id,
    company_id: dbPeriod.company_id,
    fecha_inicio: dbPeriod.fecha_inicio,
    fecha_fin: dbPeriod.fecha_fin,
    estado: dbPeriod.estado as 'borrador' | 'en_proceso' | 'cerrado' | 'aprobado',
    tipo_periodo: dbPeriod.tipo_periodo as 'quincenal' | 'mensual' | 'semanal' | 'personalizado',
    periodo: dbPeriod.periodo || `${dbPeriod.fecha_inicio}-${dbPeriod.fecha_fin}`,
    empleados_count: dbPeriod.empleados_count || 0,
    total_devengado: dbPeriod.total_devengado || 0,
    total_deducciones: dbPeriod.total_deducciones || 0,
    total_neto: dbPeriod.total_neto || 0,
    created_at: dbPeriod.created_at,
    updated_at: dbPeriod.updated_at || dbPeriod.created_at || new Date().toISOString(),
    modificado_por: dbPeriod.modificado_por,
    modificado_en: dbPeriod.modificado_en
  };
};

export const usePayrollLiquidation = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [isReopenedPeriod, setIsReopenedPeriod] = useState(false);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });

  // Integrar hook de novedades
  const {
    novedadesTotals,
    loadNovedadesTotals,
    refreshEmployeeNovedades,
    getEmployeeNovedades
  } = usePayrollNovedades(currentPeriod?.id || '');

  // Inicializar período al cargar
  const initializePeriod = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Initializing payroll period...');
      
      // Check if there's a reopened period from sessionStorage
      const reopenedPeriodData = sessionStorage.getItem('reopenedPeriod');
      if (reopenedPeriodData) {
        const reopenedInfo = JSON.parse(reopenedPeriodData);
        console.log('Found reopened period:', reopenedInfo);
        
        // Create a period record for the reopened period
        const companyId = await PayrollHistoryService.getCurrentUserCompanyId();
        if (companyId) {
          // Check if period already exists in payroll_periods_real
          let { data: existingPeriod } = await supabase
            .from('payroll_periods_real')
            .select('*')
            .eq('company_id', companyId)
            .eq('estado', 'borrador')
            .single();

          if (!existingPeriod) {
            // Create the period using PayrollPeriodService
            const newPeriod = await PayrollPeriodService.createPayrollPeriod(
              reopenedInfo.startDate,
              reopenedInfo.endDate,
              'mensual'
            );
            
            if (newPeriod) {
              existingPeriod = newPeriod;
            }
          }

          if (existingPeriod) {
            setCurrentPeriod(convertToPayrollPeriod(existingPeriod));
            setIsReopenedPeriod(true);
            
            toast({
              title: "Período reabierto cargado",
              description: `Editando período ${reopenedInfo.periodo}`,
            });
            
            // Clear the sessionStorage after successful load
            sessionStorage.removeItem('reopenedPeriod');
            return;
          }
        }
      }
      
      // Buscar período activo existente (normal flow)
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
        setIsReopenedPeriod(false);
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
      
      // Cargar novedades para los empleados cargados
      if (loadedEmployees.length > 0) {
        const employeeIds = loadedEmployees.map(emp => emp.id);
        await loadNovedadesTotals(employeeIds);
        
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
  }, [toast, currentPeriod, loadNovedadesTotals]);

  // Cargar período y empleados al montar el componente
  useEffect(() => {
    initializePeriod();
  }, [initializePeriod]);

  useEffect(() => {
    if (currentPeriod) {
      loadEmployees();
    }
  }, [loadEmployees, currentPeriod]);

  // Actualizar resumen cuando cambien los empleados o novedades
  useEffect(() => {
    const updatedSummary = calculatePayrollSummary(employees);
    
    // Agregar novedades al resumen
    let totalNovedadesNetas = 0;
    employees.forEach(emp => {
      const novedades = getEmployeeNovedades(emp.id);
      totalNovedadesNetas += novedades.totalNeto;
    });
    
    setSummary({
      ...updatedSummary,
      totalNetPay: updatedSummary.totalNetPay + totalNovedadesNetas
    });
  }, [employees, novedadesTotals, getEmployeeNovedades]);

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

    const updatedEmployees = await Promise.all(
      employees.map(async (emp) => {
        if (emp.id === id) {
          const updated = convertToBaseEmployeeData(emp);
          const updatedWithNewValue = { ...updated, [field]: value };
          return await calculateEmployee(updatedWithNewValue, currentPeriod.tipo_periodo as 'quincenal' | 'mensual');
        }
        return emp;
      })
    );
    
    setEmployees(updatedEmployees);
  }, [currentPeriod, toast, employees]);

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

        const recalculatedEmployees = await Promise.all(
          employees.map(async (emp) => {
            const baseData = convertToBaseEmployeeData(emp);
            return await calculateEmployee(baseData, updatedPeriod.tipo_periodo as 'quincenal' | 'mensual');
          })
        );
        
        setEmployees(recalculatedEmployees);
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
  }, [currentPeriod, toast, employees]);

  // Recalcular todos los empleados con configuración actualizada
  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;

    setIsLoading(true);
    toast({
      title: "Recalculando nómina",
      description: "Aplicando configuración legal actualizada a todos los empleados..."
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const recalculatedEmployees = await Promise.all(
        employees.map(async (emp) => {
          const baseData = convertToBaseEmployeeData(emp);
          return await calculateEmployee(baseData, currentPeriod.tipo_periodo as 'quincenal' | 'mensual');
        })
      );
      
      setEmployees(recalculatedEmployees);

      // Recargar novedades después del recálculo
      if (recalculatedEmployees.length > 0) {
        const employeeIds = recalculatedEmployees.map(emp => emp.id);
        await loadNovedadesTotals(employeeIds);
      }

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
  }, [toast, currentPeriod, employees, loadNovedadesTotals]);

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
      title: isReopenedPeriod ? "Cerrando período reabierto" : "Aprobando período",
      description: isReopenedPeriod ? "Finalizando edición y generando nuevos comprobantes..." : "Guardando nómina y generando comprobantes..."
    });

    try {
      const liquidationData = {
        period: currentPeriod,
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

      // If this was a reopened period, create audit log for closure
      if (isReopenedPeriod) {
        const companyId = await PayrollHistoryService.getCurrentUserCompanyId();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (companyId && user) {
          await supabase
            .from('payroll_reopen_audit')
            .insert({
              company_id: companyId,
              periodo: `${currentPeriod.fecha_inicio} - ${currentPeriod.fecha_fin}`,
              user_id: user.id,
              user_email: user.email || '',
              action: 'cerrado_nuevamente',
              previous_state: 'reabierto',
              new_state: 'cerrado',
              has_vouchers: true,
              notes: `Período cerrado nuevamente desde liquidación de nómina`
            });
        }
        
        setIsReopenedPeriod(false);
      }
      
      toast({
        title: isReopenedPeriod ? "¡Período cerrado nuevamente!" : "¡Período aprobado!",
        description: `${message} Puedes consultar el período procesado desde el Historial de Nómina.`
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
  }, [toast, employees, currentPeriod, isReopenedPeriod]);

  const handleFinishEditing = useCallback(async () => {
    await approvePeriod();
  }, [approvePeriod]);

  const handleDismissBanner = useCallback(() => {
    setIsReopenedPeriod(false);
  }, []);

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
    isReopenedPeriod,
    setIsEditingPeriod,
    updateEmployee,
    updatePeriod,
    recalculateAll,
    approvePeriod,
    refreshEmployees: loadEmployees,
    handleFinishEditing,
    handleDismissBanner,
    // Exportar funciones de novedades
    novedadesTotals,
    refreshEmployeeNovedades,
    getEmployeeNovedades
  };
};
