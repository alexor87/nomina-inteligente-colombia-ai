
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

      if (data?.success && data.htmlContent) {
        // Crear un blob HTML y abrirlo en una nueva ventana para imprimir como PDF
        const htmlBlob = new Blob([data.htmlContent], { type: 'text/html' });
        const htmlUrl = window.URL.createObjectURL(htmlBlob);
        
        // Generar nombre del archivo dinámicamente
        const fileName = `comprobante_${voucher.employeeCedula}_${voucher.periodo.replace(/\s+/g, '_').replace(/[\/\\:*?"<>|]/g, '_')}.pdf`;
        
        // Abrir en nueva ventana para que el usuario pueda imprimir o guardar como PDF
        const printWindow = window.open(htmlUrl, '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.title = fileName;
          printWindow.onload = () => {
            // Opcional: iniciar diálogo de impresión automáticamente
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          };
        }
        
        // Limpiar URL después de un tiempo
        setTimeout(() => {
          window.URL.revokeObjectURL(htmlUrl);
        }, 30000);
      } else {
        throw new Error('No se pudo generar el contenido del comprobante');
      }
    } catch (error: any) {
      console.error('Error downloading voucher:', error);
      throw new Error('Error al descargar el comprobante: ' + error.message);
    }
  }

  static async previewVoucher(voucher: PayrollVoucher): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: { voucherId: voucher.id }
      });

      if (error) throw error;

      if (data?.success && data.htmlContent) {
        return data.htmlContent;
      } else {
        throw new Error('No se pudo generar el contenido del comprobante');
      }
    } catch (error: any) {
      console.error('Error previewing voucher:', error);
      throw new Error('Error al generar vista previa: ' + error.message);
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

  static async downloadAllVouchers(vouchers: PayrollVoucher[]): Promise<void> {
    if (vouchers.length === 0) {
      throw new Error('No hay comprobantes para descargar');
    }

    console.log(`Iniciando descarga masiva de ${vouchers.length} comprobantes...`);
    
    for (const voucher of vouchers) {
      try {
        await this.downloadVoucher(voucher);
        // Esperar un poco entre descargas para no sobrecargar el navegador
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error descargando comprobante para ${voucher.employeeName}:`, error);
      }
    }
  }
}
