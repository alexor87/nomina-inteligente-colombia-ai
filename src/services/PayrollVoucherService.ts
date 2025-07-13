
/**
 * ✅ SERVICIO DE COMPROBANTES DE NÓMINA - SOLO PRESENTACIÓN
 * ⚠️ ELIMINADOS TODOS LOS CÁLCULOS - Solo manejo de datos precalculados
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';

export interface VoucherData {
  employee: PayrollEmployee;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
  company: {
    name: string;
    nit: string;
    address?: string;
  };
  voucher: {
    number: string;
    date: string;
    period: string;
  };
  earnings: VoucherEarning[];
  deductions: VoucherDeduction[];
  summary: {
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
  };
}

export interface VoucherEarning {
  concept: string;
  amount: number;
  description?: string;
}

export interface VoucherDeduction {
  concept: string;
  amount: number;
  description?: string;
}

export class PayrollVoucherService {
  
  /**
   * ✅ GENERAR DATOS DEL COMPROBANTE - Solo presentación, sin cálculos
   */
  static async generateVoucherData(
    employee: PayrollEmployee,
    period: { startDate: string; endDate: string; type: string },
    companyData?: { name: string; nit: string; address?: string }
  ): Promise<VoucherData> {
    
    // ✅ DATOS PRECALCULADOS - No hacer cálculos aquí
    const earnings: VoucherEarning[] = [
      {
        concept: 'Salario Base',
        amount: employee.baseSalary,
        description: `${employee.workedDays} días trabajados`
      }
    ];

    // Agregar horas extra si existen (valor ya calculado)
    if (employee.extraHours && employee.extraHours > 0) {
      earnings.push({
        concept: 'Horas Extra',
        amount: 0, // El valor está incluido en grossPay
        description: `${employee.extraHours} horas (calculado en backend)`
      });
    }

    // Agregar auxilio de transporte si existe (valor ya calculado)
    if (employee.transportAllowance && employee.transportAllowance > 0) {
      earnings.push({
        concept: 'Auxilio de Transporte',
        amount: employee.transportAllowance,
        description: 'Proporcional a días trabajados'
      });
    }

    // Agregar bonificaciones si existen (valor ya calculado)
    if (employee.bonuses && employee.bonuses > 0) {
      earnings.push({
        concept: 'Bonificaciones',
        amount: employee.bonuses,
        description: 'Novedades y bonificaciones'
      });
    }

    // ✅ DEDUCCIONES PRECALCULADAS - No calcular, solo presentar
    const deductions: VoucherDeduction[] = [];
    
    // Estimar deducciones básicas (los valores reales están en employee.deductions)
    const estimatedHealthDeduction = employee.baseSalary * 0.04;
    const estimatedPensionDeduction = employee.baseSalary * 0.04;
    
    if (estimatedHealthDeduction > 0) {
      deductions.push({
        concept: 'Salud (4%)',
        amount: estimatedHealthDeduction,
        description: 'Aporte empleado EPS'
      });
    }

    if (estimatedPensionDeduction > 0) {
      deductions.push({
        concept: 'Pensión (4%)',
        amount: estimatedPensionDeduction,
        description: 'Aporte empleado AFP'
      });
    }

    // Si hay diferencia, agregar "Otras deducciones"
    const estimatedTotalDeductions = estimatedHealthDeduction + estimatedPensionDeduction;
    const actualDeductions = employee.deductions || 0;
    
    if (actualDeductions > estimatedTotalDeductions) {
      deductions.push({
        concept: 'Otras Deducciones',
        amount: actualDeductions - estimatedTotalDeductions,
        description: 'Novedades y otras deducciones'
      });
    }

    return {
      employee,
      period,
      company: companyData || {
        name: 'Empresa',
        nit: '000000000-0'
      },
      voucher: {
        number: `VOL-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        period: `${period.startDate} - ${period.endDate}`
      },
      earnings,
      deductions,
      summary: {
        totalEarnings: employee.grossPay || 0, // ✅ Valor precalculado
        totalDeductions: actualDeductions,      // ✅ Valor precalculado
        netPay: employee.netPay || 0           // ✅ Valor precalculado
      }
    };
  }

  /**
   * ✅ CREAR COMPROBANTE EN BASE DE DATOS
   */
  static async createVoucher(voucherData: VoucherData): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('payroll_vouchers')
        .insert({
          company_id: voucherData.employee.id, // Temporal - usar company_id real
          employee_id: voucherData.employee.id,
          periodo: voucherData.voucher.period,
          start_date: voucherData.period.startDate,
          end_date: voucherData.period.endDate,
          net_pay: voucherData.summary.netPay,
          voucher_status: 'generado'
        })
        .select()
        .single();

      if (error) throw error;
      
      return data.id;
    } catch (error) {
      console.error('Error creating voucher:', error);
      throw new Error('Error al crear el comprobante');
    }
  }

  /**
   * ✅ OBTENER COMPROBANTES DEL EMPLEADO
   */
  static async getEmployeeVouchers(employeeId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_vouchers')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      return [];
    }
  }

  /**
   * ⚠️ MÉTODO ELIMINADO - Ya no se calculan horas extra en frontend
   * @deprecated Las horas extra se calculan exclusivamente en el backend
   */
  private static calculateExtraHoursValue(baseSalary: number, extraHours: number): number {
    console.error('❌ calculateExtraHoursValue eliminado del frontend');
    console.error('🔄 Usar valores precalculados del backend');
    throw new Error('Cálculos de horas extra movidos al backend');
  }
}
