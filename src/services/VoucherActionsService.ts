import { supabase } from '@/integrations/supabase/client';
import { PayrollVoucher } from '@/types/vouchers';

export class VoucherActionsService {
  static async downloadVoucher(voucher: PayrollVoucher): Promise<void> {
    try {
      // Llamar a la función para generar el PDF
      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: { voucherId: voucher.id }
      });

      if (error) throw error;

      if (data.htmlContent) {
        // Crear un blob HTML y abrirlo en una nueva ventana para imprimir como PDF
        const htmlBlob = new Blob([data.htmlContent], { type: 'text/html' });
        const htmlUrl = window.URL.createObjectURL(htmlBlob);
        
        // Abrir en nueva ventana para que el usuario pueda imprimir o guardar como PDF
        const printWindow = window.open(htmlUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            // Opcional: iniciar impresión automáticamente
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          };
        }
        
        // Limpiar URL después de un tiempo
        setTimeout(() => {
          window.URL.revokeObjectURL(htmlUrl);
        }, 10000);
      }
    } catch (error: any) {
      console.error('Error downloading voucher:', error);
      throw new Error('Error al descargar el comprobante: ' + error.message);
    }
  }

  static async sendVoucherByEmail(voucherId: string, employeeEmail: string): Promise<void> {
    if (!employeeEmail) {
      throw new Error('El empleado no tiene correo electrónico registrado');
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-voucher-email', {
        body: { voucherId, employeeEmail }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error('Error al enviar el correo');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new Error('Error al enviar el correo: ' + error.message);
    }
  }

  static async regenerateVoucher(voucherId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: { voucherId, regenerate: true }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error('Error al regenerar el comprobante');
      }
    } catch (error: any) {
      console.error('Error regenerating voucher:', error);
      throw new Error('Error al regenerar el comprobante: ' + error.message);
    }
  }

  static async updateVoucherStatus(voucherId: string, status: 'generado' | 'pendiente' | 'enviado' | 'error'): Promise<void> {
    await supabase
      .from('payroll_vouchers')
      .update({ voucher_status: status })
      .eq('id', voucherId);
  }
}
