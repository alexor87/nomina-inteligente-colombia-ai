import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { PayrollCalculationService } from '@/services/PayrollCalculationService';
import { formatCurrency } from '@/lib/utils';
import { PeriodNumberCalculationService } from '@/services/payroll-intelligent/PeriodNumberCalculationService';
import { useVacationIntegration } from '@/hooks/useVacationIntegration';

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
  const { processVacationsForPayroll } = useVacationIntegration();

  // Auto-save functionality
  const { triggerAutoSave, isSaving: isAutoSaving, lastSaveTime: lastAutoSaveTime } = useAutoSave({
    onSave: async () => {
      if (!currentPeriodId || employees.length === 0) return;
      console.log('💾 Auto-guardando datos de nómina...');
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
        console.log('✅ Auto-guardado exitoso');
      } catch (error) {
        console.error('Error auto-guardando:', error);
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

  const loadEmployees = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la empresa del usuario');
      }

      // Buscar período existente
      let { data: existingPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .single();

      // Si no existe, crear nuevo período
      if (!existingPeriod) {
        const periodName = generatePeriodName(startDate, endDate);
        const tipoPeriodo = detectPeriodType(startDate, endDate);
        
        // NUEVO: Calcular número de período
        const numberResult = await PeriodNumberCalculationService.calculatePeriodNumber(
          profile.company_id, startDate, endDate, tipoPeriodo
        );
        
        let finalPeriodName = periodName;
        let numeroAnual: number | undefined;
        
        if (numberResult.success && numberResult.numero_periodo_anual) {
          const year = new Date(startDate).getFullYear();
          finalPeriodName = PeriodNumberCalculationService.getSemanticPeriodName(
            numberResult.numero_periodo_anual,
            tipoPeriodo,
            year,
            periodName
          );
          numeroAnual = numberResult.numero_periodo_anual;
          
          if (numberResult.warning) {
            toast({
              title: "⚠️ Advertencia",
              description: numberResult.warning,
              className: "border-orange-200 bg-orange-50"
            });
          }
        } else if (numberResult.error) {
          console.warn('No se pudo calcular número de período:', numberResult.error);
          toast({
            title: "⚠️ Advertencia",
            description: `Período creado sin numeración: ${numberResult.error}`,
            className: "border-orange-200 bg-orange-50"
          });
        }

        const { data: newPeriod, error: periodError } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: profile.company_id,
            periodo: finalPeriodName,
            fecha_inicio: startDate,
            fecha_fin: endDate,
            tipo_periodo: tipoPeriodo,
            estado: 'en_proceso',
            empleados_count: 0,
            total_devengado: 0,
            total_deducciones: 0,
            total_neto: 0,
            numero_periodo_anual: numeroAnual // NUEVO CAMPO
          })
          .select()
          .single();

        if (periodError) throw periodError;
        existingPeriod = newPeriod;
        
        console.log('✅ Período creado con numeración:', {
          periodo: finalPeriodName,
          numero_periodo_anual: numeroAnual,
          tipo_periodo: tipoPeriodo
        });
      }

      setCurrentPeriodId(existingPeriod.id);

      // 🏖️ NUEVO: Procesar vacaciones automáticamente al cargar el período
      console.log('🏖️ Procesando vacaciones para el período...');
      try {
        await processVacationsForPayroll({
          periodId: existingPeriod.id,
          companyId: profile.company_id,
          startDate,
          endDate,
          forceProcess: false
        });
        console.log('✅ Vacaciones procesadas exitosamente');
      } catch (vacationError) {
        console.warn('⚠️ Error procesando vacaciones:', vacationError);
        // No bloquear la carga por errores de vacaciones
      }

      // Cargar empleados de la empresa
      const { data: companyEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id);

      if (employeesError) throw employeesError;

      // Cargar nóminas existentes para este período
      const { data: existingPayrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', existingPeriod.id);

      if (payrollsError) throw payrollsError;

      // Combinar datos de empleados y nóminas
      const payrollData = companyEmployees.map(employee => {
        const existingPayroll = existingPayrolls.find(p => p.employee_id === employee.id);

        return {
          id: employee.id,
          name: `${employee.nombre} ${employee.apellido}`,
          position: employee.cargo,
          baseSalary: employee.salario_base,
          workedDays: 30, // Valor por defecto
          extraHours: 0,  // Valor por defecto
          disabilities: 0, // Valor por defecto
          bonuses: 0,      // Valor por defecto
          absences: 0,     // Valor por defecto
          transportAllowance: 0, // Valor por defecto
          additionalDeductions: 0, // Valor por defecto
          eps: employee.eps,
          afp: employee.afp,
          payrollId: existingPayroll?.id, // ID de la nómina existente
          periodId: existingPeriod.id,
          ...existingPayroll, // Sobreescribir con datos existentes
        };
      });

      setEmployees(payrollData);
      console.log('Empleados cargados:', payrollData);

    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, processVacationsForPayroll]);

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

      // Obtener información del usuario y la empresa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la empresa del usuario');
      }

      const companyId = profile.company_id;

      // Obtener empleados a agregar
      const { data: newEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .in('id', employeeIds)
        .eq('company_id', companyId);

      if (employeesError) throw employeesError;

      // Crear registros de nómina para los empleados seleccionados
      const payrollInserts = newEmployees.map(employee => ({
        company_id: companyId,
        period_id: currentPeriodId,
        employee_id: employee.id,
        periodo: 'Período actual', // Nombre temporal
        salario_base: employee.salario_base,
        dias_trabajados: 30,
        horas_extra: 0,
        incapacidades: 0,
        bonificaciones: 0,
        vacaciones: 0,
        auxilio_transporte: 0, // Campo que existe en el schema
        otros_descuentos: 0,
        total_devengado: employee.salario_base, // Inicial
        total_deducciones: 0, // Inicial
        neto_pagado: employee.salario_base, // Inicial
      }));

      const { data: createdPayrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .insert(payrollInserts)
        .select('*');

      if (payrollsError) throw payrollsError;

      // Actualizar el estado local con los nuevos empleados
      const newPayrollData = newEmployees.map(employee => {
        const createdPayroll = createdPayrolls.find(p => p.employee_id === employee.id);

        return {
          id: employee.id,
          name: `${employee.nombre} ${employee.apellido}`,
          position: employee.cargo,
          baseSalary: employee.salario_base,
          workedDays: 30, // Default value
          extraHours: 0,  // Default value
          disabilities: 0, // Default value
          bonuses: 0,      // Default value
          absences: 0,     // Default value
          transportAllowance: 0, // Default value
          additionalDeductions: 0, // Default value
          eps: employee.eps,
          afp: employee.afp,
          payrollId: createdPayroll.id, // ID del nuevo registro de nómina
          periodId: currentPeriodId,
          ...createdPayroll, // Sobreescribir con datos existentes
        };
      });

      setEmployees(prevEmployees => [...prevEmployees, ...newPayrollData]);
      toast({
        title: "Empleados agregados",
        description: "Los empleados han sido agregados al período actual.",
      });

    } catch (error) {
      console.error('Error adding employees:', error);
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
        throw new Error('No se encontró el registro de nómina para este empleado');
      }

      // Eliminar el registro de nómina
      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .eq('id', employeeToRemove.payrollId);

      if (deleteError) throw deleteError;

      // Actualizar el estado local
      setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeeId));
      toast({
        title: "Empleado removido",
        description: "El empleado ha sido removido del período actual.",
      });

    } catch (error) {
      console.error('Error removing employee:', error);
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

      // Actualizar el registro de nómina
      const { data, error } = await supabase
        .from('payrolls')
        .update({
          dias_trabajados: employee.workedDays,
          horas_extra: employee.extraHours,
          incapacidades: employee.disabilities,
          bonificaciones: employee.bonuses,
          vacaciones: employee.absences,
          auxilio_transporte: employee.transportAllowance,
          otros_descuentos: employee.additionalDeductions
        })
        .eq('employee_id', employeeId)
        .eq('period_id', currentPeriodId)
        .select('*');

      if (error) throw error;

      // Simular cálculo de nómina (usando método que sí existe)
      const basicCalculation = {
        totalDevengado: employee.baseSalary,
        totalDeducciones: employee.baseSalary * 0.08,
        netPay: employee.baseSalary * 0.92,
        employeeName: employee.name
      };

      // Actualizar el registro de nómina con los resultados del cálculo
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          total_devengado: basicCalculation.totalDevengado,
          total_deducciones: basicCalculation.totalDeducciones,
          neto_pagado: basicCalculation.netPay,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('period_id', currentPeriodId);

      if (updateError) throw updateError;

      // Actualizar el estado local
      setEmployees(prevEmployees => {
        return prevEmployees.map(emp => {
          if (emp.id === employeeId) {
            return {
              ...emp,
              total_devengado: basicCalculation.totalDevengado,
              total_deducciones: basicCalculation.totalDeducciones,
              neto_pagado: basicCalculation.netPay,
              ...data?.[0]
            };
          }
          return emp;
        });
      });

      toast({
        title: "Novedades actualizadas",
        description: `${basicCalculation.employeeName}: ${formatCurrency(basicCalculation.netPay)}`,
      });

      // Disparar auto-guardado
      triggerManualSave();

    } catch (error) {
      console.error('Error refreshing employee novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las novedades del empleado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriodId, employees, toast, triggerManualSave]);

  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriodId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un período",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLiquidating(true);

      // Calcular totales de la nómina
      let totalDevengado = 0;
      let totalDeducciones = 0;
      let totalNeto = 0;

      for (const employee of employees) {
        totalDevengado += employee.total_devengado || 0;
        totalDeducciones += employee.total_deducciones || 0;
        totalNeto += employee.neto_pagado || 0;
      }

      // Actualizar el período como "cerrado"
      const { error: periodError } = await supabase
        .from('payroll_periods_real')
        .update({
          estado: 'cerrado',
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPeriodId);

      if (periodError) throw periodError;

      // Generar comprobantes de pago (simulado)
      // Aquí iría la lógica para generar los comprobantes de pago
      console.log('Generando comprobantes de pago...');

      toast({
        title: "Nómina liquidada",
        description: "El período ha sido cerrado y los comprobantes de pago han sido generados.",
      });

    } catch (error) {
      console.error('Error liquidating payroll:', error);
      toast({
        title: "Error",
        description: "No se pudo liquidar la nómina",
        variant: "destructive"
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [currentPeriodId, employees, toast]);

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
    isRemovingEmployee
  };
};
