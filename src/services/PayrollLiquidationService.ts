
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollPeriod } from '@/types/payroll';
import { PayrollVoucher } from '@/types/vouchers';
import { PayrollCalculationService } from './PayrollCalculationService';

export interface PayrollLiquidationData {
  period: PayrollPeriod;
  employees: PayrollEmployee[];
  companyId: string;
}

export class PayrollLiquidationService {
  // Guardar la liquidación de nómina en la base de datos
  static async savePayrollLiquidation(data: PayrollLiquidationData): Promise<string> {
    try {
      // Guardar cada empleado en la tabla payrolls
      const payrollInserts = data.employees.map(employee => ({
        company_id: data.companyId,
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
      await this.generateVouchers(data, payrollData);

      return `Liquidación procesada exitosamente para ${data.employees.length} empleados`;
    } catch (error) {
      console.error('Error saving payroll liquidation:', error);
      throw new Error('Error al guardar la liquidación de nómina');
    }
  }

  // Generar comprobantes de nómina
  static async generateVouchers(liquidationData: PayrollLiquidationData, payrollRecords: any[]): Promise<void> {
    try {
      const voucherInserts = liquidationData.employees.map((employee, index) => ({
        company_id: liquidationData.companyId,
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
  static async loadEmployeesForLiquidation(companyId: string): Promise<PayrollEmployee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) throw error;

      return (data || []).map(emp => {
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

        return {
          ...baseEmployeeData,
          grossPay: calculation.grossPay,
          deductions: calculation.totalDeductions,
          netPay: calculation.netPay,
          transportAllowance: calculation.transportAllowance,
          employerContributions: calculation.employerContributions,
          status: 'valid' as const,
          errors: []
        };
      });
    } catch (error) {
      console.error('Error loading employees:', error);
      throw new Error('Error al cargar los empleados');
    }
  }

  // Obtener historial de liquidaciones
  static async getPayrollHistory(companyId: string): Promise<any[]> {
    try {
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
      throw new Error('Error al cargar el historial de nóminas');
    }
  }

  // Reabrir un período de nómina
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
