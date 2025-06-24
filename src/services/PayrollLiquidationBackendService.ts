import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollPeriod } from '@/types/payroll';
import { PayrollPeriodService } from './PayrollPeriodService';
import { calculateEmployeeBackend, convertToBaseEmployeeData } from '@/utils/payrollCalculationsBackend';

export interface PayrollLiquidationData {
  period: PayrollPeriod;
  employees: PayrollEmployee[];
}

export class PayrollLiquidationBackendService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      if (!profile?.company_id) {
        console.warn('User profile found but no company_id assigned');
        return null;
      }

      return profile.company_id;
    } catch (error) {
      console.error('Error getting user company ID:', error);
      return null;
    }
  }

  static async savePayrollLiquidation(data: PayrollLiquidationData): Promise<string> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      const payrollInserts = data.employees.map(employee => ({
        company_id: companyId,
        employee_id: employee.id,
        periodo: `${data.period.startDate} al ${data.period.endDate}`,
        salario_base: employee.baseSalary,
        dias_trabajados: employee.workedDays,
        horas_extra: employee.extraHours,
        bonificaciones: employee.bonuses,
        auxilio_transporte: employee.transportAllowance,
        total_devengado: employee.grossPay,
        salud_empleado: employee.grossPay * 0.04,
        pension_empleado: employee.grossPay * 0.04,
        total_deducciones: employee.deductions,
        neto_pagado: employee.netPay,
        estado: 'procesada'
      }));

      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .insert(payrollInserts)
        .select();

      if (payrollError) throw payrollError;

      try {
        await this.generateVouchers(data, payrollData, companyId);
      } catch (voucherError) {
        console.warn('Warning: Some vouchers could not be generated:', voucherError);
      }

      return `Liquidación procesada exitosamente para ${data.employees.length} empleados`;
    } catch (error) {
      console.error('Error saving payroll liquidation:', error);
      throw new Error('Error al guardar la liquidación de nómina');
    }
  }

  static async generateVouchers(liquidationData: PayrollLiquidationData, payrollRecords: any[], companyId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const voucherInserts = liquidationData.employees.map((employee, index) => ({
        company_id: companyId,
        employee_id: employee.id,
        payroll_id: payrollRecords[index]?.id,
        periodo: `${liquidationData.period.startDate} al ${liquidationData.period.endDate}`,
        start_date: liquidationData.period.startDate,
        end_date: liquidationData.period.endDate,
        net_pay: employee.netPay,
        voucher_status: 'generado',
        sent_to_employee: false,
        generated_by: user?.id,
        pdf_url: null
      }));

      const { error } = await supabase
        .from('payroll_vouchers')
        .insert(voucherInserts);

      if (error) throw error;

      console.log(`${voucherInserts.length} comprobantes generados exitosamente`);
    } catch (error) {
      console.error('Error generating vouchers:', error);
      throw new Error('Error al generar los comprobantes');
    }
  }

  static async loadEmployeesForLiquidation(): Promise<PayrollEmployee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('No company ID found for user');
        return [];
      }

      const companySettings = await PayrollPeriodService.getCompanySettings();
      const periodType = companySettings?.periodicity || 'mensual';
      
      let defaultWorkedDays: number;
      switch (periodType) {
        case 'quincenal':
          defaultWorkedDays = 15;
          break;
        case 'mensual':
          defaultWorkedDays = 30;
          break;
        case 'semanal':
          defaultWorkedDays = 7;
          break;
        default:
          defaultWorkedDays = 30;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) {
        console.error('Error loading employees:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No active employees found for payroll liquidation');
        return [];
      }

      console.log(`Loaded ${data.length} active employees for payroll liquidation with ${periodType} periodicity`);

      // Calcular empleados usando el backend
      const employeePromises = data.map(async (emp) => {
        const baseEmployeeData = {
          id: emp.id,
          name: `${emp.nombre} ${emp.apellido}`,
          position: emp.cargo || 'No especificado',
          baseSalary: Number(emp.salario_base),
          workedDays: defaultWorkedDays,
          extraHours: 0,
          disabilities: 0,
          bonuses: 0,
          absences: 0,
          eps: emp.eps,
          afp: emp.afp
        };

        return await calculateEmployeeBackend(
          baseEmployeeData, 
          periodType === 'semanal' ? 'mensual' : periodType as 'quincenal' | 'mensual'
        );
      });

      return await Promise.all(employeePromises);
    } catch (error) {
      console.error('Error loading employees:', error);
      return [];
    }
  }

  static async getPayrollHistory(): Promise<any[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (
            nombre,
            apellido,
            cedula
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading payroll history:', error);
      return [];
    }
  }

  static async reopenPayrollPeriod(payrollIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('payrolls')
        .update({ estado: 'borrador' })
        .in('id', payrollIds);

      if (error) throw error;

      console.log(`${payrollIds.length} registros de nómina reabiertos`);
    } catch (error) {
      console.error('Error reopening payroll period:', error);
      throw new Error('Error al reabrir el período de nómina');
    }
  }
}
