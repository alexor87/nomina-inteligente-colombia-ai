
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VoucherActionsService } from '@/services/VoucherActionsService';
import { PayrollVoucher } from '@/types/vouchers';
import { Download, Mail, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoucherPreviewModalProps {
  voucher: PayrollVoucher | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (voucherId: string) => void;
  onSendEmail?: (voucherId: string) => void;
}

export const VoucherPreviewModal = ({
  voucher,
  isOpen,
  onClose,
  onDownload,
  onSendEmail
}: VoucherPreviewModalProps) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (voucher && isOpen) {
      loadPreview();
    }
  }, [voucher, isOpen]);

  const loadPreview = async () => {
    if (!voucher) return;

    try {
      setIsLoading(true);
      const content = await VoucherActionsService.previewVoucher(voucher);
      setHtmlContent(content);
    } catch (error: any) {
      toast({
        title: "Error al cargar vista previa",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!voucher) return;

    try {
      setIsDownloading(true);
      if (onDownload) {
        onDownload(voucher.id);
      } else {
        await VoucherActionsService.downloadVoucher(voucher);
      }
      
      toast({
        title: "Descarga iniciada",
        description: "El comprobante se está descargando",
      });
    } catch (error: any) {
      toast({
        title: "Error en descarga",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!voucher) return;

    try {
      setIsSending(true);
      if (onSendEmail) {
        onSendEmail(voucher.id);
      } else {
        await VoucherActionsService.sendVoucherByEmail(voucher.id, voucher.employeeEmail || '');
      }
      
      toast({
        title: "Correo enviado",
        description: `Comprobante enviado a ${voucher.employeeEmail}`,
      });
    } catch (error: any) {
      toast({
        title: "Error al enviar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>📄 Comprobante de Nómina</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          {voucher && (
            <div className="text-sm text-gray-600">
              {voucher.employeeName} - {voucher.periodo}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Generando vista previa...</p>
              </div>
            </div>
          ) : htmlContent ? (
            <iframe
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              title="Vista previa del comprobante"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No se pudo cargar el comprobante</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {voucher?.employeeEmail && (
              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={isSending || isLoading}
                className="flex items-center space-x-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                <span>Enviar por correo</span>
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading || isLoading}
              className="flex items-center space-x-2"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Descargar PDF</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
