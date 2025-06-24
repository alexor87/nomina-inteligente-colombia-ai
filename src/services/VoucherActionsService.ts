
import { supabase } from '@/integrations/supabase/client';
import { PayrollVoucher } from '@/types/vouchers';

export class VoucherActionsService {
  static async downloadVoucher(voucher: PayrollVoucher): Promise<void> {
    if (!voucher.pdfUrl) {
      throw new Error('El PDF no está disponible para este comprobante');
    }

    // Simular descarga
    const link = document.createElement('a');
    link.href = voucher.pdfUrl;
    link.download = `comprobante_${voucher.employeeCedula}_${voucher.periodo}.pdf`;
    link.click();
  }

  static async sendVoucherByEmail(voucherId: string, employeeEmail: string): Promise<void> {
    if (!employeeEmail) {
      throw new Error('El empleado no tiene correo electrónico registrado');
    }

    // Simular envío de correo
    // Actualizar estado en base de datos
    await supabase
      .from('payroll_vouchers')
      .update({ 
        sent_to_employee: true, 
        sent_date: new Date().toISOString(),
        voucher_status: 'enviado'
      })
      .eq('id', voucherId);
  }

  static async regenerateVoucher(voucherId: string): Promise<void> {
    // Lógica para regenerar comprobante
    console.log('Regenerating voucher:', voucherId);
  }

  static async updateVoucherStatus(voucherId: string, status: 'generado' | 'pendiente' | 'enviado' | 'error'): Promise<void> {
    await supabase
      .from('payroll_vouchers')
      .update({ voucher_status: status })
      .eq('id', voucherId);
  }
}
