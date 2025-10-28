import React, { useState, useEffect } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { MultiEmailInput } from '@/components/ui/multi-email-input';
import { Label } from '@/components/ui/label';
import { PayrollEmployee } from '@/types/payroll';
import { Send, X, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyDetails } from '@/hooks/useCompanyDetails';

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
  const { companyDetails, loading: companyLoading } = useCompanyDetails();

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

    if (!companyDetails) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la empresa",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    try {
      console.log('🚀 Iniciando envío de comprobantes...');
      
      // Obtener datos completos del empleado desde la BD
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('nombre, apellido, cedula, cargo, salario_base, email')
        .eq('id', employee.id)
        .single();

      if (employeeError) {
        throw new Error(`Error obteniendo datos del empleado: ${employeeError.message}`);
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // 1. Generar el PDF del comprobante una vez
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
          employee: {
            nombre: employeeData.nombre,
            apellido: employeeData.apellido,
            cedula: employeeData.cedula,
            cargo: employeeData.cargo,
            salario_base: employee.baseSalary,
            auxilio_transporte: employee.transportAllowance || 0,
            horas_extra: employee.extraHours || 0,
            bonificaciones: employee.bonuses || 0,
            comisiones: 0,
            prima: 0,
            cesantias: 0,
            vacaciones: 0,
            otros_devengos: 0,
            salud_empleado: employee.healthDeduction || 0,
            pension_empleado: employee.pensionDeduction || 0,
            retencion_fuente: 0,
            otros_descuentos: employee.deductions - (employee.healthDeduction || 0) - (employee.pensionDeduction || 0),
            total_devengado: employee.grossPay,
            total_deducciones: employee.deductions,
            neto_pagado: employee.netPay
          },
          period: {
            startDate: period.startDate,
            endDate: period.endDate,
            type: period.type,
            periodo: `${period.startDate} - ${period.endDate}`
          },
          companyInfo: companyDetails
        }
      });

      if (pdfError || !pdfData?.success) {
        throw new Error(`Error generando PDF: ${pdfError?.message || pdfData?.error || 'Error desconocido'}`);
      }

      // 2. Enviar email a todos los destinatarios
      const { error: emailError } = await supabase.functions.invoke('send-voucher-email', {
        body: {
          emails: emails,
          pdfBase64: pdfData.pdfBase64,
          employee: {
            nombre: employeeData.nombre,
            apellido: employeeData.apellido,
            cedula: employeeData.cedula,
            cargo: employeeData.cargo
          },
          period: {
            startDate: period.startDate,
            endDate: period.endDate,
            type: period.type,
            periodo: `${period.startDate} - ${period.endDate}`
          },
          companyInfo: companyDetails
        }
      });

      if (emailError) {
        throw new Error(`Error enviando emails: ${emailError.message}`);
      }

      successCount = emails.length;
      console.log(`✅ Emails enviados exitosamente a ${emails.length} destinatarios`);

      // Mostrar resultado final
      toast({
        title: "¡Éxito!",
        description: `Comprobante enviado exitosamente a ${successCount} email${successCount > 1 ? 's' : ''}`,
        className: "border-green-200 bg-green-50"
      });
      setEmails([]);
      onClose();

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

      <div className="space-y-6 mt-4">
        <div className="bg-blue-50 p-4 rounded-lg space-y-1.5">
          <div className="text-sm text-blue-600 font-medium mb-2">Empleado</div>
          <div className="font-semibold text-base">{employee.name}</div>
          <div className="text-sm text-gray-600 mt-1">{employee.position}</div>
        </div>

        <div className="space-y-3">
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
          <p className="text-xs text-gray-500 mt-2">
            Puedes agregar múltiples emails. Presiona espacio, enter o tab para agregar cada email.
            Se enviará el comprobante de pago en formato PDF como adjunto.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
        <Button variant="outline" onClick={onClose} disabled={isSending}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={handleSendVoucher}
          disabled={isSending || emails.length === 0 || isLoadingEmployeeEmail || companyLoading}
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