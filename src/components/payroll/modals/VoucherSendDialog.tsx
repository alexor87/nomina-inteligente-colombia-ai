import React, { useState, useEffect } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { MultiEmailInput } from '@/components/ui/multi-email-input';
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
  const [emails, setEmails] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingEmployeeEmail, setIsLoadingEmployeeEmail] = useState(false);
  const { toast } = useToast();

  // Cargar email del empleado desde la BD cuando se abre el diálogo
  useEffect(() => {
    const loadEmployeeEmail = async () => {
      if (!isOpen || !employee?.id || emails.length > 0) return;
      
      setIsLoadingEmployeeEmail(true);
      try {
        const { data: employeeData, error } = await supabase
          .from('employees')
          .select('email')
          .eq('id', employee.id)
          .single();

        if (!error && employeeData?.email) {
          setEmails([employeeData.email]);
        }
      } catch (error) {
        console.warn('Error loading employee email:', error);
      } finally {
        setIsLoadingEmployeeEmail(false);
      }
    };

    loadEmployeeEmail();
  }, [isOpen, employee?.id, emails.length]);

  // Resetear emails cuando se cierre el diálogo
  useEffect(() => {
    if (!isOpen) {
      setEmails([]);
    }
  }, [isOpen]);

  const handleSendVoucher = async () => {
    if (!employee || !period || emails.length === 0) {
      toast({
        title: "Error de validación",
        description: "Por favor agrega al menos un email válido",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    try {
      console.log('🚀 Iniciando envío de comprobantes...');
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Enviar a cada email secuencialmente
      for (const email of emails) {
        try {
          // 1. Generar el PDF del comprobante
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
            throw new Error(`Error generando PDF: ${pdfError?.message || 'Error desconocido'}`);
          }

          // 2. Enviar el email con el PDF adjunto
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

          if (emailError) {
            throw new Error(`Error enviando email: ${emailError.message}`);
          }

          successCount++;
          console.log(`✅ Email enviado exitosamente a ${email}`);

        } catch (error: any) {
          errorCount++;
          errors.push(`${email}: ${error.message}`);
          console.error(`❌ Error enviando a ${email}:`, error);
        }
      }

      // Mostrar resultado final
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "¡Éxito!",
          description: `Comprobante enviado exitosamente a ${successCount} email${successCount > 1 ? 's' : ''}`,
          className: "border-green-200 bg-green-50"
        });
        setEmails([]);
        onClose();
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "Envío parcialmente exitoso",
          description: `Enviado a ${successCount} email${successCount > 1 ? 's' : ''}, ${errorCount} fallaron`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error al enviar comprobantes",
          description: `Falló el envío a todos los emails: ${errors.slice(0, 2).join(', ')}`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ Error general enviando comprobantes:', error);
      toast({
        title: "Error al enviar comprobantes",
        description: error.message || "Ocurrió un error inesperado",
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
          <Label htmlFor="emails">Email(s) del destinatario</Label>
          {isLoadingEmployeeEmail ? (
            <div className="flex items-center justify-center p-4 border border-input rounded-md bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Cargando email del empleado...</span>
            </div>
          ) : (
            <MultiEmailInput
              value={emails}
              onChange={setEmails}
              placeholder={emails.length === 0 ? "Ingresa emails y presiona espacio o enter" : "Agregar otro email..."}
              disabled={isSending}
              maxEmails={10}
              className="w-full"
            />
          )}
          <p className="text-xs text-gray-500">
            Puedes agregar múltiples emails. Presiona espacio, enter o tab para agregar cada email.
            Se enviará el comprobante de pago en formato PDF como adjunto.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isSending}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={handleSendVoucher}
          disabled={isSending || emails.length === 0 || isLoadingEmployeeEmail}
          className="w-full sm:w-auto"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Enviando a {emails.length} email{emails.length > 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Comprobante{emails.length > 1 ? 's' : ''}
              {emails.length > 0 && (
                <span className="ml-1 text-xs opacity-75">({emails.length})</span>
              )}
            </>
          )}
        </Button>
      </div>
    </CustomModal>
  );
};