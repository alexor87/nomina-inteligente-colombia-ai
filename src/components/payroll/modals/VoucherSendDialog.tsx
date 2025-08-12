
import React, { useState } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PayrollEmployee } from '@/types/payroll';
import { Send, X, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoucherSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee | null;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  } | null;
}

export const VoucherSendDialog: React.FC<VoucherSendDialogProps> = ({
  isOpen,
  onClose,
  employee,
  period
}) => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendVoucher = async () => {
    if (!employee || !period || !email.trim()) {
      toast({
        title: "Error de validación",
        description: "Por favor ingresa un email válido",
        variant: "destructive"
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email con formato válido",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      // Generar PDF en base64 desde la Edge Function (modo simple)
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
          employee: {
            id: employee.id,
            name: employee.name,
            position: employee.position,
            baseSalary: employee.baseSalary,
            workedDays: employee.workedDays,
            extraHours: employee.extraHours,
            bonuses: employee.bonuses,
            disabilities: employee.disabilities,
            grossPay: employee.grossPay,
            deductions: employee.deductions,
            netPay: employee.netPay,
            eps: employee.eps,
            afp: employee.afp
          },
          period: {
            startDate: period.startDate,
            endDate: period.endDate,
            type: period.type,
            periodo: `${period.startDate} - ${period.endDate}`
          },
          returnBase64: true
        }
      });

      if (pdfError || !pdfData) {
        console.error('Error generating PDF:', pdfError);
        throw new Error('No se pudo generar el PDF del comprobante');
      }

      // Enviar el email con Resend adjuntando el PDF
      const { error: emailError } = await supabase.functions.invoke('send-voucher-email', {
        body: {
          employeeEmail: email,
          employeeName: employee.name,
          period: {
            startDate: period.startDate,
            endDate: period.endDate,
            type: period.type,
            periodo: `${period.startDate} - ${period.endDate}`
          },
          netPay: employee.netPay,
          attachment: {
            fileName: pdfData.fileName || `comprobante-${employee.name}.pdf`,
            base64: pdfData.base64,
            mimeType: pdfData.mimeType || 'application/pdf'
          }
        }
      });

      if (emailError) throw emailError;

      toast({
        title: "✅ Comprobante enviado",
        description: `El comprobante de pago se ha enviado exitosamente a ${email}`,
        className: "border-green-200 bg-green-50"
      });

      onClose();
      setEmail('');
    } catch (error) {
      console.error('Error sending voucher:', error);
      toast({
        title: "Error al enviar comprobante",
        description: "No se pudo enviar el comprobante por email",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!employee) return null;

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-lg"
      closeOnEscape={!isSending}
      closeOnBackdrop={!isSending}
    >
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Enviar Comprobante por Email
        </CustomModalTitle>
      </CustomModalHeader>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Empleado</div>
          <div className="font-semibold">{employee.name}</div>
          <div className="text-sm text-gray-600">{employee.position}</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email del destinatario</Label>
          <Input
            id="email"
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSending}
          />
          <p className="text-xs text-gray-500">
            Se enviará el comprobante de pago en formato PDF como adjunto.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isSending}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSendVoucher} disabled={isSending || !email.trim()}>
          {isSending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {isSending ? 'Enviando...' : 'Enviar Comprobante'}
        </Button>
      </div>
    </CustomModal>
  );
};
