import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';
import { VacationPayrollIntegrationService } from '@/services/vacation-integration/VacationPayrollIntegrationService';
import { PayrollValidationService } from '@/services/PayrollValidationService';

// Función para calcular días trabajados correctamente para períodos quincenales
const calculateWorkedDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // CORRECCIÓN ESPECIAL PARA PERÍODOS QUINCENALES EN FEBRERO
  // Según legislación laboral colombiana, los períodos quincenales siempre son de 15 días
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = start.getMonth();
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  
  // Si es primera quincena (1-15), siempre 15 días
  if (startDay === 1 && endDay === 15 && sameMonth) {
    return 15;
  }
  
  // Si es segunda quincena que inicia en 16, siempre 15 días (incluso en febrero)
  if (startDay === 16 && sameMonth) {
    // Para febrero, la segunda quincena va del 16 al 30 (días ficticios) = 15 días
    if (month === 1) { // Febrero
      return 15;
    }
    // Para otros meses, calcular días reales pero asegurar máximo 15
    const realDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
    return Math.min(15, Math.max(1, Math.ceil(realDays)));
  }
  
  // Para períodos no quincenales estándar, calcular normalmente
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.max(1, diffDays);
};

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

      // Query mejorado y más simple para evitar fallos
      const { data: periodEmployees, error: periodError } = await supabase
        .from('payrolls')
        .select('*, employees(*)')
        .eq('company_id', companyId)
        .eq('period_id', period.id);

      if (periodError) {
        console.error('Error cargando empleados del período:', periodError);
        setEmployees([]);
        return;
      }

      // Logging detallado para debugging
      console.log('📊 Resultado del query de empleados:', {
        periodEmployees: periodEmployees?.length || 0,
        employees_loaded: periodData.employees_loaded,
        period_id: period.id
      });

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
          
          const workedDays = calculateWorkedDays(startDate, endDate);
          const payrollRecords = activeEmployees.map(emp => ({
            company_id: companyId,
            employee_id: emp.id,
            period_id: period.id,
            periodo: period.periodo,
            salario_base: Number(emp.salario_base) || 0,
            dias_trabajados: workedDays,
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

          // Marcar el período como inicializado y actualizar contador
          await supabase
            .from('payroll_periods_real')
            .update({ 
              employees_loaded: true,
              empleados_count: activeEmployees.length
            })
            .eq('id', period.id);

          console.log('✅ Período marcado como inicializado');

          // Convertir a formato PayrollEmployee
          const employeesList: PayrollEmployee[] = activeEmployees.map(emp => ({
            id: emp.id,
            name: `${emp.nombre} ${emp.apellido}`,
            position: emp.cargo || 'Sin cargo',
            baseSalary: Number(emp.salario_base) || 0,
            workedDays: workedDays,
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
            employerContributions: 0,
            healthDeduction: 0,
            pensionDeduction: 0
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
            employerContributions: 0,
            healthDeduction: payroll.salud_empleado || 0,
            pensionDeduction: payroll.pension_empleado || 0
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

      // Calcular días trabajados correctamente para el período actual
      const workedDays = calculateWorkedDays(currentPeriod.fecha_inicio, currentPeriod.fecha_fin);
      
      // Crear registros en payrolls para persistencia
      const payrollRecords = (newEmployees || []).map(emp => ({
        company_id: companyId,
        employee_id: emp.id,
        period_id: currentPeriod.id,
        periodo: currentPeriod.periodo,
        salario_base: Number(emp.salario_base) || 0,
        dias_trabajados: workedDays,
        total_devengado: Number(emp.salario_base) || 0,
        total_deducciones: 0,
        neto_pagado: Number(emp.salario_base) || 0,
        estado: 'borrador'
      }));

      const { error: insertError } = await supabase
        .from('payrolls')
        .insert(payrollRecords);

      if (insertError) throw insertError;

      // Actualizar contador de empleados en el período
      const newEmployeeCount = employees.length + employeeIds.length;
      await supabase
        .from('payroll_periods_real')
        .update({ empleados_count: newEmployeeCount })
        .eq('id', currentPeriod.id);

      console.log(`✅ Empleados agregados. Nuevo contador: ${newEmployeeCount}`);

      const newEmployeesList: PayrollEmployee[] = (newEmployees || []).map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`,
        position: emp.cargo || 'Sin cargo',
        baseSalary: Number(emp.salario_base) || 0,
        workedDays: workedDays,
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
        employerContributions: 0,
        healthDeduction: 0,
        pensionDeduction: 0
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
  }, [currentPeriod, companyId, employees.length, toast]);

  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      console.log('🗑️ Eliminando empleado del período:', { employeeId, periodId: currentPeriod.id, companyId });

      // CORRECCIÓN: Incluir company_id para eliminación segura y correcta
      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .eq('period_id', currentPeriod.id);

      if (deleteError) {
        console.error('Error eliminando empleado de payrolls:', deleteError);
        throw deleteError;
      }

      // Actualizar contador de empleados en el período
      const newEmployeeCount = employees.length - 1;
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({ empleados_count: newEmployeeCount })
        .eq('id', currentPeriod.id);

      if (updateError) {
        console.warn('Error actualizando contador de empleados:', updateError);
      }

      console.log(`✅ Empleado eliminado correctamente. Nuevo contador: ${newEmployeeCount}`);

      // Actualizar estado local
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));

    } catch (error) {
      console.error('Error removiendo empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado",
        variant: "destructive",
      });
    }
  }, [currentPeriod, companyId, employees.length, toast]);

  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriod || employees.length === 0) return;

    setIsLiquidating(true);
    try {
      console.log('🏖️ Iniciando liquidación quincenal completa...');

      // PASO 1: Procesar todas las vacaciones/ausencias pendientes
      const integrationResult = await VacationPayrollIntegrationService.processVacationsForPayroll({
        periodId: currentPeriod.id,
        companyId: companyId,
        startDate: startDate,
        endDate: endDate
      });

      console.log('✅ Resultado de integración de vacaciones:', integrationResult);

      // PASO 2: Validación pre-liquidación
      console.log('🔍 Ejecutando validación pre-liquidación...');
      const { data: validationData, error: validationError } = await supabase.functions.invoke('payroll-liquidation-atomic', {
        body: {
          action: 'validate_pre_liquidation',
          data: {
            period_id: currentPeriod.id,
            company_id: companyId
          }
        }
      });

      if (validationError || !validationData.success) {
        throw new Error(`Error en validación: ${validationError?.message || validationData.error || 'Error desconocido'}`);
      }

      const validation = validationData.validation;
      
      // Verificar si hay errores críticos
      const criticalIssues = validation.issues.filter((issue: any) => issue.severity === 'high');
      if (criticalIssues.length > 0) {
        throw new Error(`Validación fallida: ${criticalIssues.map((i: any) => i.message).join(', ')}`);
      }

      console.log('✅ Validación pre-liquidación completada:', validation.summary);

      // PASO 3: Ejecutar liquidación atómica
      console.log('💰 Ejecutando liquidación atómica...');
      const { data: liquidationData, error: liquidationError } = await supabase.functions.invoke('payroll-liquidation-atomic', {
        body: {
          action: 'execute_atomic_liquidation',
          data: {
            period_id: currentPeriod.id,
            company_id: companyId,
            validated_employees: validation.summary.totalEmployees
          }
        }
      });

      if (liquidationError || !liquidationData.success) {
        throw new Error(`Error en liquidación: ${liquidationError?.message || liquidationData.error || 'Error desconocido'}`);
      }

      const liquidation = liquidationData.liquidation;

      console.log('✅ LIQUIDACIÓN ATÓMICA COMPLETADA:', liquidation);

      toast({
        title: "✅ Liquidación Exitosa",
        description: `${liquidation.employees_processed} empleados procesados, ${liquidation.vouchers_generated} vouchers generados`,
        className: "border-green-200 bg-green-50"
      });

    } catch (error) {
      console.error('❌ Error en liquidación quincenal:', error);
      toast({
        title: "❌ Error en liquidación",
        description: "No se pudo completar la liquidación del período",
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

  // ✅ NUEVA FUNCIÓN: Persistir cálculos de preliquidación automáticamente
  const updateEmployeeCalculationsInDB = useCallback(async (
    employeeCalculations: Record<string, { 
      totalToPay: number; 
      ibc: number; 
      grossPay?: number; 
      deductions?: number; 
      healthDeduction?: number; 
      pensionDeduction?: number; 
      transportAllowance?: number; 
    }>
  ) => {
    if (!currentPeriod?.id || Object.keys(employeeCalculations).length === 0) return;

    try {
      console.log('💾 Persistiendo cálculos de preliquidación para', Object.keys(employeeCalculations).length, 'empleados');
      
      // Actualizar cada empleado en la tabla payrolls
      for (const [employeeId, calculation] of Object.entries(employeeCalculations)) {
        console.log('💾 Persistiendo valores exactos del backend para empleado:', employeeId, {
          healthDeduction: calculation.healthDeduction,
          pensionDeduction: calculation.pensionDeduction,
          totalToPay: calculation.totalToPay,
          grossPay: calculation.grossPay,
          deductions: calculation.deductions
        });

        // ✅ CORRECCIÓN CRÍTICA: Persistir valores exactos calculados por el backend
        const { error } = await supabase
          .from('payrolls')
          .update({
            total_devengado: calculation.grossPay || calculation.totalToPay,
            salud_empleado: calculation.healthDeduction || 0, // ✅ Valor exacto del backend
            pension_empleado: calculation.pensionDeduction || 0, // ✅ Valor exacto del backend  
            auxilio_transporte: calculation.transportAllowance || 0,
            total_deducciones: calculation.deductions || 0,
            neto_pagado: calculation.totalToPay, // ✅ Neto correcto del backend
            updated_at: new Date().toISOString()
          })
          .eq('company_id', companyId)
          .eq('employee_id', employeeId)
          .eq('period_id', currentPeriod.id);

        if (error) {
          console.error('❌ Error actualizando empleado:', employeeId, error);
        } else {
          console.log('✅ Empleado actualizado:', employeeId, 'Neto:', calculation.totalToPay);
        }
      }

      // Actualizar totales del período
      const totalDevengado = Object.values(employeeCalculations).reduce((sum, calc) => sum + (calc.grossPay || calc.totalToPay), 0);
      const totalDeducciones = Object.values(employeeCalculations).reduce((sum, calc) => sum + (calc.deductions || 0), 0);
      const totalNeto = Object.values(employeeCalculations).reduce((sum, calc) => sum + calc.totalToPay, 0);

      await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPeriod.id);

      console.log('✅ Totales del período actualizados:', {
        devengado: totalDevengado,
        deducciones: totalDeducciones,
        neto: totalNeto
      });

    } catch (error) {
      console.error('❌ Error persistiendo cálculos:', error);
    }
  }, [currentPeriod, companyId]);

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
    updateEmployeeCalculationsInDB,
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
