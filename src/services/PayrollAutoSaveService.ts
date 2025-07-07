
import { supabase } from '@/integrations/supabase/client';

export class PayrollAutoSaveService {
  
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static async getActivePeriod(): Promise<any | null> {
    try {
      const { data, error } = await supabase.rpc('get_active_period_for_company');
      
      if (error) {
        console.error('Error getting active period:', error);
        return null;
      }

      return data?.has_active_period ? data.period : null;
    } catch (error) {
      console.error('Error calling get_active_period_for_company:', error);
      return null;
    }
  }

  static async saveDraftEmployees(periodId: string, employees: any[]): Promise<void> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se pudo obtener la empresa del usuario');
    }

    try {
      // Primero, eliminar registros borrador existentes para este período
      await supabase
        .from('payrolls')
        .delete()
        .eq('period_id', periodId)
        .eq('estado', 'borrador');

      // Crear nuevos registros borrador
      const draftPayrolls = employees.map(employee => ({
        company_id: companyId,
        employee_id: employee.id,
        period_id: periodId,
        periodo: employee.period || '',
        salario_base: employee.baseSalary,
        dias_trabajados: employee.workedDays,
        auxilio_transporte: employee.transportAllowance,
        total_devengado: employee.grossPay,
        total_deducciones: employee.deductions,
        neto_pagado: employee.netPay,
        estado: 'borrador'
      }));

      if (draftPayrolls.length > 0) {
        const { error } = await supabase
          .from('payrolls')
          .insert(draftPayrolls);

        if (error) {
          throw error;
        }
      }

      // Actualizar el estado del período a 'en_proceso'
      await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'en_proceso',
          empleados_count: employees.length,
          total_devengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
          total_deducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
          total_neto: employees.reduce((sum, emp) => sum + emp.netPay, 0)
        })
        .eq('id', periodId);

      console.log('✅ Draft employees saved successfully:', draftPayrolls.length);
    } catch (error) {
      console.error('❌ Error saving draft employees:', error);
      throw error;
    }
  }

  static async loadDraftEmployees(periodId: string): Promise<any[]> {
    try {
      const { data: draftPayrolls, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees:employee_id (
            id, nombre, apellido, cargo, salario_base
          )
        `)
        .eq('period_id', periodId)
        .eq('estado', 'borrador');

      if (error) {
        throw error;
      }

      // Transform to PayrollEmployee format
      const employees = draftPayrolls?.map(payroll => ({
        id: payroll.employee_id,
        name: `${payroll.employees?.nombre} ${payroll.employees?.apellido}`,
        position: payroll.employees?.cargo || 'Empleado',
        baseSalary: payroll.salario_base,
        workedDays: payroll.dias_trabajados,
        extraHours: 0,
        disabilities: 0,
        bonuses: payroll.bonificaciones || 0,
        absences: 0,
        grossPay: payroll.total_devengado,
        deductions: payroll.total_deducciones,
        netPay: payroll.neto_pagado,
        status: 'valid' as const,
        errors: [],
        transportAllowance: payroll.auxilio_transporte,
        employerContributions: 0
      })) || [];

      console.log('✅ Draft employees loaded:', employees.length);
      return employees;
    } catch (error) {
      console.error('❌ Error loading draft employees:', error);
      throw error;
    }
  }

  static async updatePeriodActivity(periodId: string): Promise<void> {
    try {
      await supabase
        .from('payroll_periods_real')
        .update({ 
          updated_at: new Date().toISOString() // This will trigger the activity update
        })
        .eq('id', periodId);
    } catch (error) {
      console.error('❌ Error updating period activity:', error);
    }
  }
}
