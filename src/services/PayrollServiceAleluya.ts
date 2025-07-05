
/**
 * 🎯 SERVICIO ALELUYA - LIQUIDACIÓN DE NÓMINA REPARADO
 * Servicio completo con funciones implementadas correctamente
 * REPARADO: Generación automática de registros y estados normalizados
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';

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
   * 📅 CARGAR PERÍODO ACTUAL - REPARADO
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

      // No hay período activo - sugerir creación
      const suggestion = await this.suggestNextPeriod(companyId);
      
      return {
        period: null,
        employees: [],
        summary: this.getEmptySummary(),
        needsCreation: true,
        message: `Crear nuevo período: ${suggestion.periodName}`
      };

    } catch (error) {
      console.error('❌ Error cargando período:', error);
      throw new Error('No se pudo cargar el período de nómina');
    }
  }

  /**
   * 🏗️ CREAR NUEVO PERÍODO - REPARADO
   */
  static async createNewPeriod(): Promise<{
    period: PayrollPeriod;
    employees: PayrollEmployee[];
    message: string;
  }> {
    try {
      const companyId = await this.getCurrentCompanyId();
      const suggestion = await this.suggestNextPeriod(companyId);
      
      console.log('🔨 Creando período:', suggestion.periodName);
      
      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: suggestion.periodName,
          fecha_inicio: suggestion.startDate,
          fecha_fin: suggestion.endDate,
          tipo_periodo: suggestion.type,
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
        message: `Período ${suggestion.periodName} creado con ${employees.length} empleados`
      };

    } catch (error) {
      console.error('❌ Error creando período:', error);
      throw new Error('No se pudo crear el nuevo período');
    }
  }

  /**
   * 💰 LIQUIDAR NÓMINA - REPARADO
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
   * 🔒 CERRAR PERÍODO - REPARADO
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

  // ===== MÉTODOS PRIVADOS REPARADOS =====

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

  private static async suggestNextPeriod(companyId: string) {
    // Obtener periodicidad configurada
    const { data: settings } = await supabase
      .from('company_settings')
      .select('periodicity')
      .eq('company_id', companyId)
      .single();

    const periodicity = settings?.periodicity || 'quincenal';
    const now = new Date();
    
    // Calcular período basado en fecha actual (3 julio 2025)
    if (periodicity === 'quincenal') {
      if (now.getDate() <= 15) {
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          endDate: new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0],
          periodName: `1 - 15 ${this.getMonthName(now.getMonth())} ${now.getFullYear()}`,
          type: 'quincenal' as const
        };
      } else {
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 16).toISOString().split('T')[0],
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
          periodName: `16 - ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} ${this.getMonthName(now.getMonth())} ${now.getFullYear()}`,
          type: 'quincenal' as const
        };
      }
    }

    // Mensual por defecto
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      periodName: `${this.getMonthName(now.getMonth())} ${now.getFullYear()}`,
      type: 'mensual' as const
    };
  }

  private static getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month];
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
      .select('periodo, tipo_periodo')
      .eq('id', periodId)
      .single();

    const periodName = period?.periodo || 'Período actual';
    const periodType = period?.tipo_periodo || 'mensual';

    // Calcular días según tipo de período
    let workDays = 30;
    if (periodType === 'quincenal') workDays = 15;
    else if (periodType === 'semanal') workDays = 7;

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
