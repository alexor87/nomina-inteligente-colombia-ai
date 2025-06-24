
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollPeriod } from '@/types/payroll';
import { PayrollCalculationService } from './PayrollCalculationService';

export interface PayrollLiquidationData {
  period: PayrollPeriod;
  employees: PayrollEmployee[];
}

export class PayrollLiquidationService {
  // Obtener el company_id del usuario actual
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
      console.error('Error getting user company ID:', error);
      return null;
    }
  }

  // Guardar la liquidación de nómina en la base de datos
  static async savePayrollLiquidation(data: PayrollLiquidationData): Promise<string> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      // Guardar cada empleado en la tabla payrolls
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

      // Generar comprobantes de nómina para cada empleado
      await this.generateVouchers(data, payrollData, companyId);

      return `Liquidación procesada exitosamente para ${data.employees.length} empleados`;
    } catch (error) {
      console.error('Error saving payroll liquidation:', error);
      throw new Error('Error al guardar la liquidación de nómina');
    }
  }

  // Generar comprobantes de nómina
  static async generateVouchers(liquidationData: PayrollLiquidationData, payrollRecords: any[], companyId: string): Promise<void> {
    try {
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
        pdf_url: `/vouchers/pdf/${employee.id}_${liquidationData.period.startDate}_${liquidationData.period.endDate}.pdf`
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

  // Cargar empleados de la empresa para la liquidación
  static async loadEmployeesForLiquidation(): Promise<PayrollEmployee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('No company ID found for user, loading sample data');
        return this.getSampleEmployees();
      }

      // Cargar TODOS los empleados, no solo los activos, para que coincida con el módulo de empleados
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No employees found, returning sample data');
        return this.getSampleEmployees();
      }

      console.log(`Loaded ${data.length} employees for payroll liquidation`);

      return data.map(emp => {
        const baseEmployeeData = {
          id: emp.id,
          name: `${emp.nombre} ${emp.apellido}`,
          position: emp.cargo || 'No especificado',
          baseSalary: Number(emp.salario_base),
          workedDays: 30,
          extraHours: 0,
          disabilities: 0,
          bonuses: 0,
          absences: 0,
          eps: emp.eps,
          afp: emp.afp
        };

        // Calcular datos de nómina usando el servicio de cálculo
        const calculation = PayrollCalculationService.calculatePayroll({
          baseSalary: baseEmployeeData.baseSalary,
          workedDays: baseEmployeeData.workedDays,
          extraHours: baseEmployeeData.extraHours,
          disabilities: baseEmployeeData.disabilities,
          bonuses: baseEmployeeData.bonuses,
          absences: baseEmployeeData.absences,
          periodType: 'mensual'
        });

        // Marcar como válido solo si el empleado está activo
        const isActive = emp.estado === 'activo';
        const status = isActive ? 'valid' : 'incomplete';
        const errors = isActive ? [] : ['Empleado no activo'];

        return {
          ...baseEmployeeData,
          grossPay: calculation.grossPay,
          deductions: calculation.totalDeductions,
          netPay: calculation.netPay,
          transportAllowance: calculation.transportAllowance,
          employerContributions: calculation.employerContributions,
          status: status as const,
          errors
        };
      });
    } catch (error) {
      console.error('Error loading employees:', error);
      // Return sample data as fallback
      return this.getSampleEmployees();
    }
  }

  // Datos de muestra para cuando no hay empleados reales
  static getSampleEmployees(): PayrollEmployee[] {
    return [
      {
        id: 'sample-1',
        name: 'Juan Pérez',
        position: 'Desarrollador',
        baseSalary: 3000000,
        workedDays: 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: 3000000,
        deductions: 240000,
        netPay: 2760000,
        transportAllowance: 140606,
        employerContributions: 765000,
        status: 'valid',
        errors: [],
        eps: 'SURA',
        afp: 'PROTECCIÓN'
      },
      {
        id: 'sample-2',
        name: 'María González',
        position: 'Contadora',
        baseSalary: 2500000,
        workedDays: 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: 2500000,
        deductions: 200000,
        netPay: 2300000,
        transportAllowance: 140606,
        employerContributions: 637500,
        status: 'valid',
        errors: [],
        eps: 'COMPENSAR',
        afp: 'COLFONDOS'
      }
    ];
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
