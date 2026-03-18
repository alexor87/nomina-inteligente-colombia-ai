import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { formatCurrency } from '@/lib/utils';
import { PeriodNumberCalculationService } from '@/services/payroll-intelligent/PeriodNumberCalculationService';
import { PayrollSummary } from '@/types/payroll';

interface EmployeePayrollData {
  employeeId: string;
  periodId: string;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  transportAllowance: number;
  baseSalary: number;
  eps: string;
  afp: string;
  additionalDeductions: number;
}

export const usePayrollLiquidation = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const { toast } = useToast();

  // Auto-save functionality
  const { triggerAutoSave, isSaving: isAutoSaving, lastSaveTime: lastAutoSaveTime } = useAutoSave({
    onSave: async () => {
      if (!currentPeriodId || employees.length === 0) return;
      logger.log('💾 Auto-guardando datos de nómina...');
      try {
        for (const employee of employees) {
          await supabase
            .from('payrolls')
            .update({
              dias_trabajados: employee.worked_days,
              horas_extra: employee.extra_hours,
              incapacidades: employee.disabilities,
              bonificaciones: employee.bonuses,
              vacaciones: employee.absences,
              auxilio_transporte: employee.transport_allowance,
              otros_descuentos: employee.additional_deductions,
              updated_at: new Date().toISOString()
            })
            .eq('id', employee.payrollId);
        }
        logger.log('✅ Auto-guardado exitoso');
      } catch (error) {
        logger.error('Error auto-guardando:', error);
        toast({
          title: "Error auto-guardando",
          description: "Hubo un problema al guardar automáticamente los datos.",
          variant: "destructive",
        });
      }
    },
    delay: 15000, // 15 segundos
  });

  const triggerManualSave = useCallback(() => {
    triggerAutoSave();
  }, [triggerAutoSave]);

  const loadEmployees = useCallback(async (startDate: string, endDate: string, year?: string) => {
    setIsLoading(true);
    try {
      logger.log('🔄 Cargando empleados con cálculos correctos...');
      
      // ✅ CORREGIDO: Usar el servicio que ya calcula correctamente con año
      const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate, year);
      
      // ✅ CORREGIDO: Obtener o crear período usando el servicio
      const periodId = await PayrollLiquidationService.ensurePeriodExists(startDate, endDate);
      logger.log('🔍 DEBUG - ensurePeriodExists returned periodId:', periodId);
      setCurrentPeriodId(periodId);
      logger.log('🔍 DEBUG - currentPeriodId set to:', periodId);

      // ✅ CORREGIDO: Mapear datos con valores ya calculados correctamente
      const mappedEmployees = employeesData.map(employee => ({
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: 'Empleado', // Posición por defecto
        baseSalary: employee.salario_base,
        worked_days: employee.dias_trabajados, // Ya calculado proporcionalmente
        extra_hours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        transport_allowance: employee.auxilio_transporte, // Ya calculado
        additional_deductions: employee.deducciones_novedades,
        eps: '',
        afp: '',
        // ✅ VALORES YA CALCULADOS CORRECTAMENTE POR EL SERVICIO
        total_devengado: employee.devengos + (employee.salario_base / 30) * employee.dias_trabajados + employee.auxilio_transporte,
        total_deducciones: employee.deducciones,
        neto_pagado: employee.total_pagar,
        payrollId: null, // Se asignará al crear el registro
        periodId: periodId
      }));

      setEmployees(mappedEmployees);
      
      logger.log('✅ Empleados cargados con cálculos correctos:', mappedEmployees.length);
      logger.log('📊 Ejemplo - Primer empleado:', mappedEmployees[0]);

    } catch (error) {
      logger.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriodId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un período",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // ✅ CORREGIDO: Usar el servicio para cargar empleados específicos con año
      const newEmployeesData = await PayrollLiquidationService.loadSpecificEmployeesForPeriod(
        employeeIds, 
        // Obtener fechas del período actual
        new Date().toISOString().split('T')[0],
        new Date().toISOString().split('T')[0],
        new Date().getFullYear().toString() // Usar año actual como fallback
      );

      // Mapear nuevos empleados
      const newMappedEmployees = newEmployeesData.map(employee => ({
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: 'Empleado',
        baseSalary: employee.salario_base,
        worked_days: employee.dias_trabajados,
        extra_hours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        transport_allowance: employee.auxilio_transporte,
        additional_deductions: employee.deducciones_novedades,
        eps: '',
        afp: '',
        total_devengado: employee.devengos + (employee.salario_base / 30) * employee.dias_trabajados + employee.auxilio_transporte,
        total_deducciones: employee.deducciones,
        neto_pagado: employee.total_pagar,
        payrollId: null,
        periodId: currentPeriodId
      }));

      setEmployees(prevEmployees => [...prevEmployees, ...newMappedEmployees]);
      
      toast({
        title: "Empleados agregados",
        description: "Los empleados han sido agregados al período actual.",
      });

    } catch (error) {
      logger.error('Error adding employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriodId, toast]);

  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriodId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un período",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRemovingEmployee(true);

      // Obtener el payrollId del empleado
      const employeeToRemove = employees.find(emp => emp.id === employeeId);
      if (!employeeToRemove?.payrollId) {
        // Si no tiene payrollId, solo remover del estado local
        setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeeId));
        toast({
          title: "Empleado removido",
          description: "El empleado ha sido removido del período actual.",
        });
        return;
      }

      logger.log(`🗑️ Removiendo empleado ${employeeId} del período ${currentPeriodId}`);

      // 1. PRIMERO: Eliminar novedades del empleado para este período
      const { data: deletedNovedades, error: novedadesDeleteError } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('empleado_id', employeeId)
        .eq('periodo_id', currentPeriodId)
        .select('id');

      if (novedadesDeleteError) {
        logger.error('❌ Error eliminando novedades:', novedadesDeleteError);
        // Continuar con la eliminación del payroll de todos modos
      } else {
        const novedadesCount = deletedNovedades?.length || 0;
        logger.log(`✅ Novedades eliminadas: ${novedadesCount}`);
      }

      // 2. SEGUNDO: Eliminar el registro de nómina
      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .eq('id', employeeToRemove.payrollId);

      if (deleteError) throw deleteError;

      logger.log(`✅ Empleado ${employeeId} removido exitosamente`);

      // Actualizar el estado local
      setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeeId));
      toast({
        title: "Empleado removido",
        description: "El empleado y sus novedades han sido removidos del período actual.",
      });

    } catch (error) {
      logger.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado",
        variant: "destructive"
      });
    } finally {
      setIsRemovingEmployee(false);
    }
  }, [currentPeriodId, employees, toast]);

  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!currentPeriodId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un período",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Buscar el empleado en el estado local
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }

      // ✅ CORREGIDO: Recalcular usando los valores ya existentes del servicio
      const salarioProporcional = (employee.baseSalary / 30) * employee.worked_days;
      const totalDevengado = salarioProporcional + employee.transport_allowance + employee.bonuses;
      const totalDeducciones = employee.total_deducciones + employee.additional_deductions;
      const netoPagado = totalDevengado - totalDeducciones;

      // Actualizar el estado local
      setEmployees(prevEmployees => {
        return prevEmployees.map(emp => {
          if (emp.id === employeeId) {
            return {
              ...emp,
              total_devengado: totalDevengado,
              total_deducciones: totalDeducciones,
              neto_pagado: netoPagado
            };
          }
          return emp;
        });
      });

      toast({
        title: "Novedades actualizadas",
        description: `${employee.name}: ${formatCurrency(netoPagado)}`,
      });

      // Disparar auto-guardado
      triggerManualSave();

    } catch (error) {
      logger.error('Error refreshing employee novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las novedades del empleado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriodId, employees, toast, triggerManualSave]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [liquidationResult, setLiquidationResult] = useState<{
    periodData: { startDate: string; endDate: string; type: string };
    summary: PayrollSummary;
    periodId: string;
    companyId: string;
    employeeCount: number;
  } | null>(null);

  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriodId || employees.length === 0) {
      toast({
        title: "Error",
        description: "No hay empleados para liquidar",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLiquidating(true);
      
      logger.log('🚀 Iniciando liquidación con datos correctos...');

      const result = await PayrollLiquidationService.liquidatePayroll(
        employees, 
        startDate, 
        endDate
      );

      if (result.success && result.summary) {
        logger.log('✅ Liquidación exitosa:', result.message);
        
        // 🔍 DEBUGGING summary antes del modal
        logger.log('🔍 DEBUGGING summary antes del modal:', {
          totalNetPay: result.summary.totalNetPay,
          tipo: typeof result.summary.totalNetPay,
          isFinite: Number.isFinite(result.summary.totalNetPay)
        });

        // ✅ CORREGIDO: Registrar provisiones automáticamente usando el período correcto
        let companyId: string | null = null;
        try {
          const { data: authData } = await supabase.auth.getUser();
          const userId = authData.user?.id;
          let provisionMode: 'on_liquidation' | 'monthly_consolidation' = 'on_liquidation';

          if (userId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('company_id')
              .eq('user_id', userId)
              .single();
            companyId = profile?.company_id || null;
          }

          if (companyId) {
            const { data: companySettings } = await supabase
              .from('company_settings')
              .select('provision_mode')
              .eq('company_id', companyId)
              .single();
            
            provisionMode = (companySettings?.provision_mode as any) || 'on_liquidation';
          }

          if (provisionMode === 'on_liquidation') {
            logger.log('🧮 Registrando provisiones automáticamente...');
            
            // ✅ CORREGIDO: Usar el período correcto del resultado, no currentPeriodId
            const finalPeriodId = result.periodId || currentPeriodId;
            logger.log('📋 Usando período para provisiones:', finalPeriodId);

            const { data: provisionResp, error: provisionErr } = await supabase.functions.invoke('provision-social-benefits', {
              body: { period_id: finalPeriodId }
            });

            if (provisionErr) {
              logger.error('❌ Error calculando provisiones:', provisionErr);
              toast({
                title: "Advertencia",
                description: "La nómina se liquidó exitosamente, pero hubo un problema calculando las provisiones automáticamente. Puede recalcularlas manualmente desde el módulo de Prestaciones Sociales.",
                variant: "destructive",
              });
            } else {
              logger.log('✅ Provisiones registradas automáticamente:', provisionResp);
              
              // Mostrar notificación de éxito con conteo
              const provisionCount = provisionResp?.count || 0;
              if (provisionCount > 0) {
                toast({
                  title: "Provisiones registradas",
                  description: `Se calcularon y registraron ${provisionCount} provisiones automáticamente.`,
                  className: "border-green-200 bg-green-50"
                });
              }
            }
          } else {
            logger.log('📋 Provisiones en modo consolidado mensual - no se calculan automáticamente');
            toast({
              title: "Modo consolidación mensual",
              description: "Las provisiones se registrarán cuando ejecute la consolidación mensual desde Prestaciones Sociales.",
              className: "border-blue-200 bg-blue-50"
            });
          }
        } catch (provError) {
          logger.warn('⚠️ Error procesando provisiones:', provError);
          toast({
            title: "Advertencia",
            description: "La nómina se liquidó exitosamente, pero no se pudieron calcular las provisiones automáticamente. Puede hacerlo manualmente desde Prestaciones Sociales.",
            variant: "destructive",
          });
        }
        
        const periodType = detectPeriodType(startDate, endDate);
        const finalPeriodId = result.periodId || currentPeriodId || '';

        setLiquidationResult({
          periodData: { startDate, endDate, type: periodType },
          summary: result.summary,
          periodId: finalPeriodId,
          companyId: companyId || '',
          employeeCount: employees.length
        });

        setShowSuccessModal(true);

        setEmployees([]);
        setCurrentPeriodId(null);
        
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      logger.error('❌ Error liquidating payroll:', error);
      toast({
        title: "Error",
        description: "No se pudo liquidar la nómina: " + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive"
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [currentPeriodId, employees, toast]);

  const closeSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setLiquidationResult(null);
  }, []);

  const detectPeriodType = (startDate: string, endDate: string): 'semanal' | 'quincenal' | 'mensual' => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays <= 7) {
      return 'semanal';
    } else if (diffDays <= 16) {
      return 'quincenal';
    } else {
      return 'mensual';
    }
  };

  const generatePeriodName = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      if (start.getDate() === 1 && end.getDate() === 15) {
        return `1 - 15 ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      } else if (start.getDate() === 16) {
        return `16 - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      } else if (start.getDate() === 1 && end.getDate() === new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()) {
        return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      }
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

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
    triggerManualSave,
    isRemovingEmployee,
    showSuccessModal,
    liquidationResult,
    closeSuccessModal
  };
};
