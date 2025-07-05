
/**
 * 🎯 SERVICIO ALELUYA - LIQUIDACIÓN DE NÓMINA SIMPLIFICADO
 * Servicio simple sin detección automática de períodos
 * SIMPLIFICADO: Usuario elige fechas manualmente
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { getPeriodNameFromDates } from '@/utils/periodDateUtils';

export interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'borrador' | 'cerrado';
  tipo_periodo: 'quincenal' | 'mensual' | 'semanal';
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
}

export class PayrollServiceAleluya {
  /**
   * 📅 CARGAR PERÍODO ACTUAL - SIMPLIFICADO
   */
  static async loadCurrentPeriod(): Promise<{
    period: PayrollPeriod | null;
    employees: PayrollEmployee[];
    summary: PayrollSummary;
    needsCreation: boolean;
    message: string;
  }> {
    try {
      const companyId = await this.getCurrentCompanyId();
      
      // Buscar período activo (solo borrador)
      const { data: activePeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activePeriod) {
        console.log('🔍 Período activo encontrado:', activePeriod.periodo);
        
        const normalizedPeriod: PayrollPeriod = {
          ...activePeriod,
          estado: this.normalizeStatus(activePeriod.estado),
          tipo_periodo: this.normalizeType(activePeriod.tipo_periodo)
        };
        
        // Cargar empleados y generar registros si no existen
        let employees = await this.loadEmployeesForPeriod(activePeriod.id);
        
        // Si no hay empleados, generar automáticamente
        if (employees.length === 0) {
          console.log('⚡ Generando registros de empleados automáticamente...');
          employees = await this.generatePayrollRecords(activePeriod.id);
        }
        
        const summary = this.calculateSummary(employees);
        
        return {
          period: normalizedPeriod,
          employees,
          summary,
          needsCreation: false,
          message: `Período activo: ${activePeriod.periodo}`
        };
      }

      // No hay período activo - mostrar formulario de creación
      return {
        period: null,
        employees: [],
        summary: this.getEmptySummary(),
        needsCreation: true,
        message: 'Selecciona las fechas para crear un nuevo período'
      };

    } catch (error) {
      console.error('❌ Error cargando período:', error);
      throw new Error('No se pudo cargar el período de nómina');
    }
  }

  /**
   * 🏗️ CREAR PERÍODO CON FECHAS - SIMPLIFICADO
   */
  static async createPeriodWithDates(startDate: string, endDate: string): Promise<{
    period: PayrollPeriod;
    employees: PayrollEmployee[];
    message: string;
  }> {
    try {
      const companyId = await this.getCurrentCompanyId();
      
      // Generar nombre del período basado en las fechas
      const periodName = getPeriodNameFromDates(startDate, endDate);
      
      // Determinar tipo de período basado en los días
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      
      let tipoPerido: 'semanal' | 'quincenal' | 'mensual' = 'mensual';
      if (daysDiff <= 7) tipoPerido = 'semanal';
      else if (daysDiff <= 16) tipoPerido = 'quincenal';
      
      console.log('🔨 Creando período:', periodName, `(${daysDiff} días)`);
      
      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: tipoPerido,
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select()
        .single();

      if (error) throw error;

      const normalizedPeriod: PayrollPeriod = {
        ...newPeriod,
        estado: this.normalizeStatus(newPeriod.estado),
        tipo_periodo: this.normalizeType(newPeriod.tipo_periodo)
      };

      // Generar registros de empleados automáticamente
      const employees = await this.generatePayrollRecords(newPeriod.id);
      
      console.log('✅ Período creado con', employees.length, 'empleados');
      
      return {
        period: normalizedPeriod,
        employees,
        message: `Período ${periodName} creado con ${employees.length} empleados`
      };

    } catch (error) {
      console.error('❌ Error creando período:', error);
      throw new Error('No se pudo crear el nuevo período');
    }
  }

  /**
   * 💰 LIQUIDAR NÓMINA - SIMPLIFICADO
   */
  static async liquidatePayroll(
    periodId: string, 
    selectedEmployeeIds: string[]
  ): Promise<{
    processedEmployees: number;
    totalAmount: number;
    message: string;
  }> {
    try {
      if (selectedEmployeeIds.length === 0) {
        throw new Error('Debe seleccionar al menos un empleado para liquidar');
      }

      console.log('💰 Liquidando nómina para', selectedEmployeeIds.length, 'empleados');

      // Actualizar estado de empleados seleccionados a "procesada"
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({ estado: 'procesada' })
        .eq('period_id', periodId)
        .in('employee_id', selectedEmployeeIds);

      if (updateError) throw updateError;

      // Actualizar totales del período
      await this.updatePeriodTotals(periodId);
      
      // Calcular monto total
      const { data: payrolls } = await supabase
        .from('payrolls')
        .select('neto_pagado')
        .eq('period_id', periodId)
        .in('employee_id', selectedEmployeeIds);

      const totalAmount = (payrolls || []).reduce((sum, p) => sum + (p.neto_pagado || 0), 0);
      
      return {
        processedEmployees: selectedEmployeeIds.length,
        totalAmount,
        message: `Nómina liquidada: ${selectedEmployeeIds.length} empleados por $${totalAmount.toLocaleString()}`
      };

    } catch (error) {
      console.error('❌ Error liquidando nómina:', error);
      throw new Error('No se pudo completar la liquidación');
    }
  }

  /**
   * 🔒 CERRAR PERÍODO - SIMPLIFICADO
   */
  static async closePeriod(periodId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('🔒 Cerrando período:', periodId);
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (error) throw error;

      // También actualizar payrolls relacionados
      const { error: payrollError } = await supabase
        .from('payrolls')
        .update({ estado: 'cerrada' })
        .eq('period_id', periodId);

      if (payrollError) console.warn('Warning updating payrolls:', payrollError);

      return {
        success: true,
        message: 'Período cerrado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      throw new Error('No se pudo cerrar el período');
    }
  }

  // ===== MÉTODOS PRIVADOS SIMPLIFICADOS =====

  private static async getCurrentCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('Usuario no tiene empresa asociada');
    }

    return profile.company_id;
  }

  private static normalizeType(type: string): 'quincenal' | 'mensual' | 'semanal' {
    switch (type) {
      case 'quincenal':
        return 'quincenal';
      case 'semanal':
        return 'semanal';
      default:
        return 'mensual';
    }
  }

  private static normalizeStatus(status: string): 'borrador' | 'cerrado' {
    return status === 'cerrado' ? 'cerrado' : 'borrador';
  }

  private static async loadEmployeesForPeriod(periodId: string): Promise<PayrollEmployee[]> {
    const { data: payrolls } = await supabase
      .from('payrolls')
      .select(`
        *,
        employees (
          nombre,
          cargo,
          salario_base
        )
      `)
      .eq('period_id', periodId);

    return (payrolls || []).map(payroll => ({
      id: payroll.employee_id,
      name: payroll.employees?.nombre || 'Sin nombre',
      position: payroll.employees?.cargo || 'Sin cargo',
      baseSalary: payroll.salario_base || 0,
      workedDays: payroll.dias_trabajados || 30,
      extraHours: 0,
      disabilities: 0,
      bonuses: 0,
      absences: 0,
      grossPay: payroll.total_devengado || 0,
      deductions: payroll.total_deducciones || 0,
      netPay: payroll.neto_pagado || 0,
      transportAllowance: payroll.auxilio_transporte || 0,
      employerContributions: (payroll.total_devengado || 0) * 0.205,
      status: payroll.estado === 'procesada' ? 'valid' : 'incomplete' as const,
      errors: []
    }));
  }

  private static async generatePayrollRecords(periodId: string): Promise<PayrollEmployee[]> {
    const companyId = await this.getCurrentCompanyId();
    
    // Obtener empleados activos
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('estado', 'activo');

    if (!employees || employees.length === 0) {
      console.log('⚠️ No hay empleados activos para generar registros');
      return [];
    }

    // Obtener información del período
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('periodo, tipo_periodo, fecha_inicio, fecha_fin')
      .eq('id', periodId)
      .single();

    const periodName = period?.periodo || 'Período actual';
    const periodType = period?.tipo_periodo || 'mensual';

    // Calcular días según fechas reales del período
    let workDays = 30;
    if (period?.fecha_inicio && period?.fecha_fin) {
      const start = new Date(period.fecha_inicio);
      const end = new Date(period.fecha_fin);
      workDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    // Crear registros de nómina
    const payrollRecords = employees.map(emp => ({
      company_id: companyId,
      employee_id: emp.id,
      period_id: periodId,
      periodo: periodName,
      salario_base: emp.salario_base || 0,
      dias_trabajados: workDays,
      total_devengado: Math.round((emp.salario_base || 0) * (workDays / 30)),
      total_deducciones: Math.round((emp.salario_base || 0) * (workDays / 30) * 0.08),
      neto_pagado: Math.round((emp.salario_base || 0) * (workDays / 30) * 0.92),
      auxilio_transporte: emp.salario_base <= 2600000 ? Math.round(162000 * (workDays / 30)) : 0,
      estado: 'borrador'
    }));

    const { error } = await supabase.from('payrolls').insert(payrollRecords);
    if (error) {
      console.error('❌ Error insertando registros de nómina:', error);
      throw error;
    }

    console.log('✅ Generados', payrollRecords.length, 'registros de nómina');

    // Actualizar totales del período
    await this.updatePeriodTotals(periodId);

    return this.loadEmployeesForPeriod(periodId);
  }

  private static async updatePeriodTotals(periodId: string): Promise<void> {
    const { data: payrolls } = await supabase
      .from('payrolls')
      .select('total_devengado, total_deducciones, neto_pagado')
      .eq('period_id', periodId);

    if (payrolls && payrolls.length > 0) {
      const totals = payrolls.reduce((acc, p) => ({
        devengado: acc.devengado + (p.total_devengado || 0),
        deducciones: acc.deducciones + (p.total_deducciones || 0),
        neto: acc.neto + (p.neto_pagado || 0)
      }), { devengado: 0, deducciones: 0, neto: 0 });

      await supabase
        .from('payroll_periods_real')
        .update({
          empleados_count: payrolls.length,
          total_devengado: totals.devengado,
          total_deducciones: totals.deducciones,
          total_neto: totals.neto
        })
        .eq('id', periodId);
    }
  }

  private static calculateSummary(employees: PayrollEmployee[]): PayrollSummary {
    const validEmployees = employees.filter(emp => emp.status === 'valid' || emp.status === 'incomplete');
    
    return {
      totalEmployees: employees.length,
      validEmployees: validEmployees.length,
      totalGrossPay: validEmployees.reduce((sum, emp) => sum + emp.grossPay, 0),
      totalDeductions: validEmployees.reduce((sum, emp) => sum + emp.deductions, 0),
      totalNetPay: validEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
      employerContributions: validEmployees.reduce((sum, emp) => sum + emp.employerContributions, 0),
      totalPayrollCost: validEmployees.reduce((sum, emp) => sum + emp.grossPay + emp.employerContributions, 0)
    };
  }

  private static getEmptySummary(): PayrollSummary {
    return {
      totalEmployees: 0,
      validEmployees: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      employerContributions: 0,
      totalPayrollCost: 0
    };
  }
}
