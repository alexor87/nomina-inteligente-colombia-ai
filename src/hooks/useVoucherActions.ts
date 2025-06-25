
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

    const vouchersToDownload = vouchers.filter(v => selectedVouchers.includes(v.id));

    toast({
      title: "Descarga masiva iniciada",
      description: `Preparando descarga de ${vouchersToDownload.length} comprobantes...`,
    });

    try {
      await VoucherActionsService.downloadAllVouchers(vouchersToDownload);
      
      // Registrar auditoría para cada comprobante
      for (const voucher of vouchersToDownload) {
        await VoucherAuditService.logAction(voucher.id, voucher.companyId, 'downloaded', 'bulk');
      }

      toast({
        title: "Descarga completada",
        description: `Se iniciaron ${vouchersToDownload.length} descargas`,
      });
    } catch (error: any) {
      toast({
        title: "Error en descarga masiva",
        description: error.message,
        variant: "destructive"
      });
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

    toast({
      title: "Enviando correos...",
      description: `Enviando ${vouchersToSend.length} comprobantes por correo`,
    });

    // Envío masivo con manejo de errores individual
    let successCount = 0;
    let errorCount = 0;

    for (const voucher of vouchersToSend) {
      try {
        await VoucherActionsService.sendVoucherByEmail(voucher.id, voucher.employeeEmail || '');
        await VoucherAuditService.logAction(voucher.id, voucher.companyId, 'sent_email', 'bulk_email', voucher.employeeEmail);
        successCount++;
      } catch (error) {
        console.error(`Error enviando a ${voucher.employeeName}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: "Envío completado",
        description: `${successCount} comprobantes enviados exitosamente${errorCount > 0 ? `, ${errorCount} fallaron` : ''}`,
      });
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: "Error en envío masivo",
        description: "No se pudo enviar ningún comprobante",
        variant: "destructive"
      });
    }

    await refreshVouchers();
  };

  const regenerateVoucher = async (voucherId: string) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    try {
      await VoucherActionsService.regenerateVoucher(voucherId);
      await VoucherAuditService.logAction(voucherId, voucher.companyId, 'regenerated');

      toast({
        title: "Comprobante regenerado",
        description: "El comprobante ha sido regenerado exitosamente",
      });

      await refreshVouchers();
    } catch (error: any) {
      toast({
        title: "Error al regenerar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    downloadVoucher,
    downloadSelectedVouchers,
    sendVoucherByEmail,
    sendSelectedVouchersByEmail,
    regenerateVoucher
  };
};
