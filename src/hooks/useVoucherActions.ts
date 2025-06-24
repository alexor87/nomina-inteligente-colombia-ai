
import { PayrollVoucher } from '@/types/vouchers';
import { VoucherActionsService } from '@/services/VoucherActionsService';
import { VoucherAuditService } from '@/services/VoucherAuditService';
import { useToast } from '@/hooks/use-toast';

export const useVoucherActions = (vouchers: PayrollVoucher[], refreshVouchers: () => Promise<void>) => {
  const { toast } = useToast();

  const downloadVoucher = async (voucherId: string) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    try {
      await VoucherActionsService.downloadVoucher(voucher);
      await VoucherAuditService.logAction(voucherId, voucher.companyId, 'downloaded', 'pdf');
      
      toast({
        title: "Descarga iniciada",
        description: "Se está descargando el PDF del comprobante",
      });
    } catch (error: any) {
      toast({
        title: "Error en descarga",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const downloadSelectedVouchers = async (selectedVouchers: string[]) => {
    if (selectedVouchers.length === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos un comprobante para descargar",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Descarga en progreso",
      description: `Preparando descarga de ${selectedVouchers.length} comprobantes...`,
    });

    // Registrar auditoría para cada comprobante
    for (const voucherId of selectedVouchers) {
      const voucher = vouchers.find(v => v.id === voucherId);
      if (voucher) {
        await VoucherAuditService.logAction(voucherId, voucher.companyId, 'downloaded', 'bulk');
      }
    }
  };

  const sendVoucherByEmail = async (voucherId: string) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    try {
      await VoucherActionsService.sendVoucherByEmail(voucherId, voucher.employeeEmail || '');
      await VoucherAuditService.logAction(voucherId, voucher.companyId, 'sent_email', 'email', voucher.employeeEmail);

      toast({
        title: "Correo enviado",
        description: `Comprobante enviado a ${voucher.employeeEmail}`,
      });

      await refreshVouchers();
    } catch (error: any) {
      toast({
        title: "Error al enviar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const sendSelectedVouchersByEmail = async (selectedVouchers: string[]) => {
    if (selectedVouchers.length === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos un comprobante para enviar",
        variant: "destructive"
      });
      return;
    }

    const vouchersToSend = vouchers.filter(v => 
      selectedVouchers.includes(v.id) && v.employeeEmail
    );

    if (vouchersToSend.length === 0) {
      toast({
        title: "Sin correos válidos",
        description: "Ninguno de los empleados seleccionados tiene correo registrado",
        variant: "destructive"
      });
      return;
    }

    // Envío masivo
    for (const voucher of vouchersToSend) {
      await VoucherActionsService.sendVoucherByEmail(voucher.id, voucher.employeeEmail || '');
      await VoucherAuditService.logAction(voucher.id, voucher.companyId, 'sent_email', 'bulk_email', voucher.employeeEmail);
    }

    toast({
      title: "Envío completado",
      description: `${vouchersToSend.length} comprobantes enviados por correo`,
    });

    await refreshVouchers();
  };

  const regenerateVoucher = async (voucherId: string) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    await VoucherActionsService.regenerateVoucher(voucherId);
    await VoucherAuditService.logAction(voucherId, voucher.companyId, 'regenerated');

    toast({
      title: "Comprobante regenerado",
      description: "El comprobante ha sido regenerado exitosamente",
    });

    await refreshVouchers();
  };

  return {
    downloadVoucher,
    downloadSelectedVouchers,
    sendVoucherByEmail,
    sendSelectedVouchersByEmail,
    regenerateVoucher
  };
};
