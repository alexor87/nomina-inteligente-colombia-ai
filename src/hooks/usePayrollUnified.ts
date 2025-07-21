
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';
import { VacationPayrollIntegrationService } from '@/services/vacation-integration/VacationPayrollIntegrationService';

interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export const usePayrollUnified = (companyId: string) => {
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const { toast } = useToast();

  // Función simple para limpiar duplicados
  const cleanDuplicates = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('clean_specific_duplicate_periods', {
        p_company_id: companyId
      });
      if (error) console.error('Error cleaning duplicates:', error);
    } catch (error) {
      console.error('Error in cleanDuplicates:', error);
    }
  }, [companyId]);

  // Función simple para encontrar o crear período
  const findOrCreatePeriod = useCallback(async (startDate: string, endDate: string): Promise<PayrollPeriod | null> => {
    try {
      console.log('🔍 Buscando período:', { startDate, endDate, companyId });

      // Limpiar duplicados primero
      await cleanDuplicates();

      // Buscar período existente (usar el más reciente si hay duplicados)
      const { data: existingPeriods, error: searchError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .order('created_at', { ascending: false })
        .limit(1);

      if (searchError) {
        console.error('Error buscando período:', searchError);
        return null;
      }

      if (existingPeriods && existingPeriods.length > 0) {
        const period = existingPeriods[0];
        
        // Si el período está cancelado, reactivarlo Y limpiar payrolls antiguos
        if (period.estado === 'cancelado') {
          console.log('🔄 Reactivando período cancelado y limpiando payrolls:', period.id);
          
          // Primero limpiar registros antiguos de payrolls
          const { error: deleteError } = await supabase
            .from('payrolls')
            .delete()
            .eq('period_id', period.id);
          
          if (deleteError) {
            console.error('Error limpiando payrolls antiguos:', deleteError);
          } else {
            console.log('✅ Payrolls antiguos eliminados');
          }
          
          // Luego reactivar el período
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({ estado: 'en_proceso' })
            .eq('id', period.id);
          
          if (updateError) {
            console.error('Error reactivando período:', updateError);
          } else {
            period.estado = 'en_proceso';
            console.log('✅ Período reactivado exitosamente');
          }
        }
        
        console.log('✅ Período encontrado:', period.id);
        return {
          id: period.id,
          periodo: period.periodo,
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin,
          estado: period.estado
        };
      }

      // Crear nuevo período si no existe
      const periodName = generatePeriodName(startDate, endDate);
      const { data: newPeriod, error: createError } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: 'quincenal',
          estado: 'en_proceso'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creando período:', createError);
        return null;
      }

      console.log('✅ Período creado:', newPeriod.id);
      return {
        id: newPeriod.id,
        periodo: newPeriod.periodo,
        fecha_inicio: newPeriod.fecha_inicio,
        fecha_fin: newPeriod.fecha_fin,
        estado: newPeriod.estado
      };

    } catch (error) {
      console.error('Error en findOrCreatePeriod:', error);
      return null;
    }
  }, [companyId, cleanDuplicates]);

  // Cargar empleados con integración automática de vacaciones
  const loadEmployees = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      console.log('📋 Cargando empleados para período:', { startDate, endDate });

      const period = await findOrCreatePeriod(startDate, endDate);
      if (!period) {
        throw new Error('No se pudo encontrar o crear el período');
      }

      setCurrentPeriod(period);

      // Procesar vacaciones/ausencias automáticamente al cargar empleados
      console.log('🏖️ Procesando vacaciones/ausencias automáticamente...');
      try {
        const integrationResult = await VacationPayrollIntegrationService.processVacationsForPayroll({
          periodId: period.id,
          companyId: companyId,
          startDate: startDate,
          endDate: endDate
        });

        if (integrationResult.success && integrationResult.processedVacations > 0) {
          toast({
            title: "✅ Vacaciones integradas",
            description: `Se procesaron ${integrationResult.processedVacations} ausencias automáticamente`,
            className: "border-green-200 bg-green-50"
          });
        }
      } catch (integrationError) {
        console.warn('⚠️ Error en integración de vacaciones:', integrationError);
        // Continuar sin bloquear la carga de empleados
      }

      // Verificar si el período ya fue inicializado con empleados
      const { data: periodData, error: periodDataError } = await supabase
        .from('payroll_periods_real')
        .select('employees_loaded')
        .eq('id', period.id)
        .single();

      if (periodDataError) {
        console.error('Error verificando estado del período:', periodDataError);
        setEmployees([]);
        return;
      }

      // Verificar si ya hay empleados en payrolls para este período
      const { data: periodEmployees, error: periodError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees!inner(*)
        `)
        .eq('company_id', companyId)
        .eq('period_id', period.id);

      if (periodError) {
        console.error('Error cargando empleados del período:', periodError);
        setEmployees([]);
        return;
      }

      // Detectar estado inconsistente: marcado como inicializado pero sin empleados
      const isInconsistentState = periodData.employees_loaded && 
                                 (!periodEmployees || periodEmployees.length === 0);

      if (isInconsistentState) {
        console.warn('⚠️ Estado inconsistente detectado: período marcado como inicializado pero sin empleados. Corrigiendo...');
        
        // Resetear el flag de inicialización
        await supabase
          .from('payroll_periods_real')
          .update({ employees_loaded: false })
          .eq('id', period.id);
      }

      // Crear empleados si NO está inicializado O si hay inconsistencia
      if (!periodData.employees_loaded || isInconsistentState) {
        console.log('🔧 No hay empleados en payrolls, creando desde empleados activos...');
        
        const { data: activeEmployees, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId)
          .eq('estado', 'activo');

        if (empError) {
          console.error('Error cargando empleados activos:', empError);
          setEmployees([]);
          return;
        }

        if (activeEmployees && activeEmployees.length > 0) {
          console.log(`✅ Encontrados ${activeEmployees.length} empleados activos`);
          
          const payrollRecords = activeEmployees.map(emp => ({
            company_id: companyId,
            employee_id: emp.id,
            period_id: period.id,
            periodo: period.periodo,
            salario_base: Number(emp.salario_base) || 0,
            dias_trabajados: 15,
            total_devengado: Number(emp.salario_base) || 0,
            total_deducciones: 0,
            neto_pagado: Number(emp.salario_base) || 0,
            estado: 'borrador'
          }));

          const { error: insertError } = await supabase
            .from('payrolls')
            .insert(payrollRecords);

          if (insertError) {
            console.error('Error creando registros de payroll:', insertError);
            setEmployees([]);
            return;
          }

          console.log('✅ Registros de payroll creados exitosamente');

          // Marcar el período como inicializado
          await supabase
            .from('payroll_periods_real')
            .update({ employees_loaded: true })
            .eq('id', period.id);

          console.log('✅ Período marcado como inicializado');

          // Convertir a formato PayrollEmployee
          const employeesList: PayrollEmployee[] = activeEmployees.map(emp => ({
            id: emp.id,
            name: `${emp.nombre} ${emp.apellido}`,
            position: emp.cargo || 'Sin cargo',
            baseSalary: Number(emp.salario_base) || 0,
            workedDays: 15,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            grossPay: Number(emp.salario_base) || 0,
            deductions: 0,
            netPay: Number(emp.salario_base) || 0,
            status: 'valid' as const,
            errors: [],
            eps: emp.eps,
            afp: emp.afp,
            transportAllowance: 0,
            employerContributions: 0
          }));

          setEmployees(employeesList);
        } else {
          console.log('⚠️ No se encontraron empleados activos');
          setEmployees([]);
        }
      } else {
        // Si el período YA fue inicializado, solo cargar empleados existentes (respetando eliminaciones)
        console.log(`✅ Período ya inicializado. Empleados en payrolls: ${periodEmployees?.length || 0}`);
        
        const employeesList: PayrollEmployee[] = (periodEmployees || []).map(payroll => {
          const emp = payroll.employees as any;
          return {
            id: emp.id,
            name: `${emp.nombre} ${emp.apellido}`,
            position: emp.cargo || 'Sin cargo',
            baseSalary: Number(emp.salario_base) || 0,
            workedDays: payroll.dias_trabajados || 15,
            extraHours: payroll.horas_extra || 0,
            disabilities: payroll.incapacidades || 0,
            bonuses: payroll.bonificaciones || 0,
            absences: 0,
            grossPay: payroll.total_devengado || Number(emp.salario_base) || 0,
            deductions: payroll.total_deducciones || 0,
            netPay: payroll.neto_pagado || Number(emp.salario_base) || 0,
            status: 'valid' as const,
            errors: [],
            eps: emp.eps,
            afp: emp.afp,
            transportAllowance: payroll.auxilio_transporte || 0,
            employerContributions: 0
          };
        });

        setEmployees(employeesList);
      }

    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive",
      });
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, findOrCreatePeriod, toast]);

  const addEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriod) return;

    try {
      const { data: newEmployees, error } = await supabase
        .from('employees')
        .select('*')
        .in('id', employeeIds);

      if (error) throw error;

      // Crear registros en payrolls para persistencia
      const payrollRecords = (newEmployees || []).map(emp => ({
        company_id: companyId,
        employee_id: emp.id,
        period_id: currentPeriod.id,
        periodo: currentPeriod.periodo,
        salario_base: Number(emp.salario_base) || 0,
        dias_trabajados: 15,
        total_devengado: Number(emp.salario_base) || 0,
        total_deducciones: 0,
        neto_pagado: Number(emp.salario_base) || 0,
        estado: 'borrador'
      }));

      const { error: insertError } = await supabase
        .from('payrolls')
        .insert(payrollRecords);

      if (insertError) throw insertError;

      const newEmployeesList: PayrollEmployee[] = (newEmployees || []).map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`,
        position: emp.cargo || 'Sin cargo',
        baseSalary: Number(emp.salario_base) || 0,
        workedDays: 15,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: Number(emp.salario_base) || 0,
        deductions: 0,
        netPay: Number(emp.salario_base) || 0,
        status: 'valid' as const,
        errors: [],
        eps: emp.eps,
        afp: emp.afp,
        transportAllowance: 0,
        employerContributions: 0
      }));

      setEmployees(prev => [...prev, ...newEmployeesList]);

    } catch (error) {
      console.error('Error agregando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados",
        variant: "destructive",
      });
    }
  }, [currentPeriod, companyId, toast]);

  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      // Remover de payrolls
      await supabase
        .from('payrolls')
        .delete()
        .eq('employee_id', employeeId)
        .eq('period_id', currentPeriod.id);

      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));

    } catch (error) {
      console.error('Error removiendo empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado",
        variant: "destructive",
      });
    }
  }, [currentPeriod, toast]);

  // Liquidación de nómina con integración completa de vacaciones
  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriod || employees.length === 0) return;

    setIsLiquidating(true);
    try {
      console.log('🏖️ Iniciando liquidación con integración completa de vacaciones...');

      // INTEGRACIÓN CRÍTICA: Procesar todas las vacaciones/ausencias pendientes
      const integrationResult = await VacationPayrollIntegrationService.processVacationsForPayroll({
        periodId: currentPeriod.id,
        companyId: companyId,
        startDate: startDate,
        endDate: endDate
      });

      console.log('✅ Resultado de integración de vacaciones:', integrationResult);

      // Actualizar estado del período a cerrado
      await supabase
        .from('payroll_periods_real')
        .update({ estado: 'cerrado' })
        .eq('id', currentPeriod.id);

      toast({
        title: "Nómina liquidada exitosamente ✅",
        description: `Se incluyeron ${integrationResult.processedVacations} ausencias/vacaciones automáticamente`,
        variant: "default",
      });

    } catch (error) {
      console.error('Error liquidando nómina:', error);
      toast({
        title: "Error",
        description: "No se pudo liquidar la nómina",
        variant: "destructive",
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [currentPeriod, employees, companyId, toast]);

  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    console.log('🔄 Refrescando novedades para empleado:', employeeId);
    // Recargar empleados para obtener los datos más actuales
    if (currentPeriod) {
      await loadEmployees(currentPeriod.fecha_inicio, currentPeriod.fecha_fin);
    }
  }, [currentPeriod, loadEmployees]);

  return {
    currentPeriod,
    employees,
    isLoading,
    isLiquidating,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    currentPeriodId: currentPeriod?.id
  };
};

// Helper function para generar nombre del período
function generatePeriodName(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const monthName = months[start.getMonth()];
  const year = start.getFullYear();
  
  return `${start.getDate()} - ${end.getDate()} ${monthName} ${year}`;
}
