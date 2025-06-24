
import { supabase } from '@/integrations/supabase/client';
import { PayrollVoucher } from '@/types/vouchers';

export class VoucherService {
  static async loadVouchers(): Promise<PayrollVoucher[]> {
    const { data, error } = await supabase
      .from('payroll_vouchers')
      .select(`
        *,
        employees (
          nombre,
          apellido,
          cedula,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(voucher => ({
      id: voucher.id,
      companyId: voucher.company_id,
      employeeId: voucher.employee_id,
      payrollId: voucher.payroll_id || undefined,
      periodo: voucher.periodo,
      startDate: voucher.start_date,
      endDate: voucher.end_date,
      netPay: Number(voucher.net_pay),
      voucherStatus: voucher.voucher_status as 'generado' | 'pendiente' | 'firmado' | 'error',
      sentToEmployee: voucher.sent_to_employee,
      sentDate: voucher.sent_date || undefined,
      pdfUrl: voucher.pdf_url || undefined,
      xmlUrl: voucher.xml_url || undefined,
      dianStatus: voucher.dian_status as 'pendiente' | 'firmado' | 'rechazado' | 'error',
      dianCufe: voucher.dian_cufe || undefined,
      electronicSignatureDate: voucher.electronic_signature_date || undefined,
      createdAt: voucher.created_at,
      updatedAt: voucher.updated_at,
      generatedBy: voucher.generated_by || undefined,
      employeeName: voucher.employees ? `${voucher.employees.nombre} ${voucher.employees.apellido}` : 'Sin nombre',
      employeeEmail: voucher.employees?.email || '',
      employeeCedula: voucher.employees?.cedula || ''
    }));
  }

  static async updateVoucher(voucherId: string, updates: Partial<PayrollVoucher>) {
    const { error } = await supabase
      .from('payroll_vouchers')
      .update(updates)
      .eq('id', voucherId);

    if (error) throw error;
  }

  static async logAction(
    voucherId: string, 
    companyId: string,
    action: string, 
    method?: string, 
    recipient?: string
  ) {
    try {
      await supabase
        .from('voucher_audit_log')
        .insert({
          company_id: companyId,
          voucher_id: voucherId,
          user_id: 'system',
          action,
          method,
          recipient_email: recipient,
          success: true
        });
    } catch (error) {
      console.error('Error logging voucher action:', error);
    }
  }
}
