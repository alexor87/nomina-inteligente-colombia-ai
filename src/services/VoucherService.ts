
import { supabase } from '@/integrations/supabase/client';
import { PayrollVoucher } from '@/types/vouchers';

export class VoucherService {
  static async loadVouchers(): Promise<PayrollVoucher[]> {
    try {
      console.log('Loading vouchers from database...');
      
      // Cargar todos los comprobantes sin verificar nóminas primero
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

      if (error) {
        console.error('Error loading vouchers:', error);
        throw error;
      }

      console.log('Raw vouchers data:', data?.length || 0);

      if (!data || data.length === 0) {
        console.log('No vouchers found in database');
        return [];
      }

      const vouchers = data.map(voucher => ({
        id: voucher.id,
        companyId: voucher.company_id,
        employeeId: voucher.employee_id,
        payrollId: voucher.payroll_id || undefined,
        periodo: voucher.periodo,
        startDate: voucher.start_date,
        endDate: voucher.end_date,
        netPay: Number(voucher.net_pay),
        voucherStatus: voucher.voucher_status as 'generado' | 'pendiente' | 'enviado' | 'error',
        sentToEmployee: voucher.sent_to_employee,
        sentDate: voucher.sent_date || undefined,
        pdfUrl: voucher.pdf_url || undefined,
        createdAt: voucher.created_at,
        updatedAt: voucher.updated_at,
        generatedBy: voucher.generated_by || undefined,
        employeeName: voucher.employees ? `${voucher.employees.nombre} ${voucher.employees.apellido}` : 'Sin nombre',
        employeeEmail: voucher.employees?.email || '',
        employeeCedula: voucher.employees?.cedula || ''
      }));

      console.log('Processed vouchers:', vouchers.length);
      return vouchers;
    } catch (error) {
      console.error('Error loading vouchers:', error);
      return [];
    }
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
