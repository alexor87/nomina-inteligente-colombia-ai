
import { supabase } from '@/integrations/supabase/client';
import { PayrollVoucher } from '@/types/vouchers';
import { VoucherPDFService } from './VoucherPDFService';

export class VoucherActionsService {
  static async downloadVoucher(voucher: PayrollVoucher): Promise<void> {
    try {
      // Obtener datos del comprobante
      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: { voucherId: voucher.id }
      });

      if (error) throw error;

      if (data?.success) {
        // Obtener información de la empresa
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', voucher.companyId)
          .single();

        // Preparar datos para el PDF
        const voucherData = {
          salaryDetails: {
            baseSalary: voucher.netPay,
            overtime: 0,
            bonuses: 0,
            totalEarnings: voucher.netPay,
            healthContribution: Math.round(voucher.netPay * 0.04),
            pensionContribution: Math.round(voucher.netPay * 0.04),
            withholdingTax: 0,
            totalDeductions: Math.round(voucher.netPay * 0.08)
          }
        };

        // Generar y descargar PDF
        await VoucherPDFService.generateAndDownload(voucher, company, voucherData);
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error descargando comprobante para ${voucher.employeeName}:`, error);
      }
    }
  }
}
