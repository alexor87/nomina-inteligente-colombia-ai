import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
  workedDays: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: 'valid' | 'invalid';
}

interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'draft' | 'closed';
}

/**
 * ✅ HOOK KISS - PROCESO SIMPLIFICADO DE LIQUIDACIÓN
 * - Solo usa Edge Function para cálculos
 * - Estados simples: draft → closed
 * - Sin servicios intermedios
 * - Sin reparaciones complejas
 */
export const usePayrollLiquidationKISS = (companyId: string) => {
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const { toast } = useToast();

  // Función para generar nombre del período
  const generatePeriodName = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = start.getDate();
    const endDay = end.getDate();
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const monthName = monthNames[start.getMonth()];
    const year = start.getFullYear();
    
    return `${startDay} - ${endDay} ${monthName} ${year}`;
  };

  // FASE 1: Cargar empleados (simplificado)
  const loadEmployees = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      console.log('📋 KISS: Cargando empleados para período:', { startDate, endDate });

      // Buscar o crear período (simplificado)
      const periodName = generatePeriodName(startDate, endDate);
      let period: PayrollPeriod;

      // Buscar período existente
      const { data: existingPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .eq('estado', 'draft')
        .single();

      if (existingPeriod) {
        period = {
          id: existingPeriod.id,
          periodo: existingPeriod.periodo,
          fecha_inicio: existingPeriod.fecha_inicio,
          fecha_fin: existingPeriod.fecha_fin,
          estado: 'draft'
        };
      } else {
        // Crear nuevo período
        const { data: newPeriod, error } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: companyId,
            periodo: periodName,
            fecha_inicio: startDate,
            fecha_fin: endDate,
            tipo_periodo: 'quincenal',
            estado: 'draft'
          })
          .select()
          .single();

        if (error) throw error;

        period = {
          id: newPeriod.id,
          periodo: newPeriod.periodo,
          fecha_inicio: newPeriod.fecha_inicio,
          fecha_fin: newPeriod.fecha_fin,
          estado: 'draft'
        };
      }

      setCurrentPeriod(period);

      // Cargar empleados activos
      const { data: activeEmployees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (empError) throw empError;

      // Convertir a formato simple
      const employeesList: PayrollEmployee[] = (activeEmployees || []).map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`,
        position: emp.cargo || 'Sin cargo',
        baseSalary: Number(emp.salario_base) || 0,
        workedDays: 15, // Fijo para quincenales
        grossPay: Number(emp.salario_base) || 0,
        deductions: 0,
        netPay: Number(emp.salario_base) || 0,
        status: 'valid'
      }));

      setEmployees(employeesList);

      toast({
        title: "✅ Empleados Cargados",
        description: `${employeesList.length} empleados listos para liquidación`,
        className: "border-green-200 bg-green-50"
      });

    } catch (error) {
      console.error('❌ KISS: Error cargando empleados:', error);
      toast({
        title: "❌ Error",
        description: "Error al cargar empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  // FASE 2: Liquidación atómica usando solo Edge Function
  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriod || employees.length === 0) return;

    setIsLiquidating(true);
    try {
      console.log('🔄 KISS: Iniciando liquidación atómica...');

      // 1. Validar empleados
      const validEmployees = employees.filter(emp => emp.status === 'valid');
      if (validEmployees.length === 0) {
        throw new Error('No hay empleados válidos para liquidar');
      }

      // 2. Calcular usando SOLO Edge Function
      console.log('🧮 KISS: Calculando con Edge Function...');
      
      const calculations = await Promise.all(
        validEmployees.map(async (employee) => {
          const { data: calculation, error } = await supabase.functions.invoke('payroll-calculations', {
            body: {
              action: 'calculate',
              employee_id: employee.id,
              salario_base: employee.baseSalary,
              dias_trabajados: employee.workedDays,
              periodo_inicio: startDate,
              periodo_fin: endDate
            }
          });

          if (error) {
            console.error(`Error calculando empleado ${employee.id}:`, error);
            throw error;
          }

          return {
            employee_id: employee.id,
            ...calculation
          };
        })
      );

      // 3. Guardar en una transacción atómica
      console.log('💾 KISS: Guardando resultados...');
      
      const payrollRecords = calculations.map(calc => ({
        company_id: companyId,
        employee_id: calc.employee_id,
        period_id: currentPeriod.id,
        periodo: currentPeriod.periodo,
        salario_base: calc.salario_base || 0,
        dias_trabajados: calc.dias_trabajados || 15,
        total_devengado: calc.total_devengado || 0,
        total_deducciones: calc.total_deducciones || 0,
        neto_pagado: calc.neto_pagado || 0,
        estado: 'procesada'
      }));

      // Eliminar registros previos y insertar nuevos
      await supabase
        .from('payrolls')
        .delete()
        .eq('period_id', currentPeriod.id);

      const { error: insertError } = await supabase
        .from('payrolls')
        .insert(payrollRecords);

      if (insertError) throw insertError;

      // 4. Actualizar totales del período
      const totales = calculations.reduce((acc, calc) => ({
        total_devengado: acc.total_devengado + (calc.total_devengado || 0),
        total_deducciones: acc.total_deducciones + (calc.total_deducciones || 0),
        total_neto: acc.total_neto + (calc.neto_pagado || 0)
      }), { total_devengado: 0, total_deducciones: 0, total_neto: 0 });

      // 5. Cerrar período y actualizar totales
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          estado: 'closed',
          empleados_count: validEmployees.length,
          total_devengado: totales.total_devengado,
          total_deducciones: totales.total_deducciones,
          total_neto: totales.total_neto,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPeriod.id);

      if (updateError) throw updateError;

      // 6. Generar vouchers automáticamente
      console.log('📄 KISS: Generando vouchers...');
      
      const voucherRecords = validEmployees.map(emp => {
        const calc = calculations.find(c => c.employee_id === emp.id);
        return {
          company_id: companyId,
          employee_id: emp.id,
          periodo: currentPeriod.periodo,
          start_date: startDate,
          end_date: endDate,
          net_pay: calc?.neto_pagado || 0,
          voucher_status: 'generado'
        };
      });

      await supabase
        .from('payroll_vouchers')
        .insert(voucherRecords);

      // Actualizar estado local
      setCurrentPeriod(prev => prev ? { ...prev, estado: 'closed' } : null);

      toast({
        title: "✅ Liquidación Completada",
        description: `Nómina liquidada para ${validEmployees.length} empleados`,
        className: "border-green-200 bg-green-50"
      });

      console.log('✅ KISS: Liquidación completada exitosamente');

    } catch (error) {
      console.error('❌ KISS: Error en liquidación:', error);
      toast({
        title: "❌ Error en Liquidación",
        description: "Error al liquidar nómina",
        variant: "destructive"
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [currentPeriod, employees, companyId, toast]);

  // Función para agregar empleados (simplificada)
  const addEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriod) return;

    try {
      const { data: newEmployees, error } = await supabase
        .from('employees')
        .select('*')
        .in('id', employeeIds)
        .eq('company_id', companyId);

      if (error) throw error;

      const newEmployeesList: PayrollEmployee[] = (newEmployees || []).map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`,
        position: emp.cargo || 'Sin cargo',
        baseSalary: Number(emp.salario_base) || 0,
        workedDays: 15,
        grossPay: Number(emp.salario_base) || 0,
        deductions: 0,
        netPay: Number(emp.salario_base) || 0,
        status: 'valid'
      }));

      setEmployees(prev => [...prev, ...newEmployeesList]);
    } catch (error) {
      console.error('Error agregando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados",
        variant: "destructive"
      });
    }
  }, [currentPeriod, companyId, toast]);

  // Función para remover empleados (simplificada)
  const removeEmployee = useCallback((employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
  }, []);

  return {
    // Estado
    currentPeriod,
    employees,
    isLoading,
    isLiquidating,
    
    // Acciones
    loadEmployees,
    liquidatePayroll,
    addEmployees,
    removeEmployee,
    
    // Estados calculados
    canProceedWithLiquidation: employees.length > 0 && currentPeriod?.estado === 'draft',
    currentPeriodId: currentPeriod?.id
  };
};