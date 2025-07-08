
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';

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

  // SOLUCIÓN KISS: Cargar SOLO empleados que están en payrolls para este período
  const loadEmployees = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      console.log('📋 Cargando empleados para período:', { startDate, endDate });

      const period = await findOrCreatePeriod(startDate, endDate);
      if (!period) {
        throw new Error('No se pudo encontrar o crear el período');
      }

      setCurrentPeriod(period);

      // CAMBIO PRINCIPAL: Cargar SOLO empleados que están en payrolls para este período
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
        
        // Si no hay empleados en payrolls, cargar empleados activos por primera vez
        const { data: activeEmployees, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId)
          .eq('estado', 'activo');

        if (empError) throw empError;

        // Crear registros en payrolls para empleados activos
        if (activeEmployees && activeEmployees.length > 0) {
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
          } else {
            console.log('✅ Registros de payroll creados para empleados activos');
          }

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
          setEmployees([]);
        }
      } else {
        // Convertir datos de payrolls + employees a formato PayrollEmployee
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
        console.log('✅ Empleados del período cargados:', employeesList.length);
      }

    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, findOrCreatePeriod, toast]);

  // MEJORAR addEmployees para asegurar persistencia en payrolls
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

  // Función simple para remover empleado (ya funcionaba correctamente)
  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      // Remover de payrolls (esto ya mantenía la persistencia)
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

  // Función simple para liquidar
  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriod || employees.length === 0) return;

    setIsLiquidating(true);
    try {
      // Actualizar estado del período
      await supabase
        .from('payroll_periods_real')
        .update({ estado: 'cerrado' })
        .eq('id', currentPeriod.id);

      toast({
        title: "Éxito",
        description: "Nómina liquidada exitosamente",
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
  }, [currentPeriod, employees, toast]);

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
