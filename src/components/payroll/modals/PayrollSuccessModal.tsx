import React, { useState } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Mail } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { PayrollSummary } from '@/types/payroll';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VoucherBulkSendService } from '@/services/VoucherBulkSendService';
import { useToast } from '@/hooks/use-toast';

interface PayrollSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodData: {
    startDate: string;
    endDate: string;
    type: string;
  };
  summary: PayrollSummary;
  periodId: string;
  companyId: string;
  employeeCount: number;
}

export const PayrollSuccessModal: React.FC<PayrollSuccessModalProps> = ({
  isOpen,
  onClose,
  periodData,
  summary,
  periodId,
  companyId,
  employeeCount
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [sendResult, setSendResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: Array<{ employeeId: string; employeeName: string; error: string }>;
  } | null>(null);

  // Load authoritative summary directly from DB - NO FALLBACKS TO PARENT DATA
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [dbSummary, setDbSummary] = React.useState<{ employeesCount: number; totalNet: number } | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      if (!isOpen || !periodId) {
        console.log('Modal not open or no periodId, clearing summary');
        setDbSummary(null);
        return;
      }
      
      console.log(`🔍 Fetching authoritative summary for periodId: ${periodId}`);
      setLoadingSummary(true);
      
      try {
        // Query with company_id for precision and add detailed logging
        const { data, error } = await supabase
          .from('payrolls')
          .select('neto_pagado, company_id')
          .eq('period_id', periodId);
          
        if (error) {
          console.error('❌ Error fetching payroll summary:', error);
          throw error;
        }
        
        const totalNet = (data as any[] | null)?.reduce((acc, row) => acc + Number(row.neto_pagado || 0), 0) ?? 0;
        const employeesCount = (data as any[] | null)?.length ?? 0;
        
        console.log(`✅ DB Summary: ${employeesCount} employees, Total: ${totalNet}`);
        
        if (isMounted) setDbSummary({ employeesCount, totalNet });
      } catch (e) {
        console.error('❌ Error fetching payroll summary:', e);
        if (isMounted) setDbSummary(null);
      } finally {
        if (isMounted) setLoadingSummary(false);
      }
    };
    
    fetchSummary();
    return () => { isMounted = false; };
  }, [isOpen, periodId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSendVouchers = async () => {
    setIsSending(true);
    setSendResult(null);

    try {
      const result = await VoucherBulkSendService.sendVouchersForPeriod(
        periodId,
        companyId,
        (current, total) => {
          setSendProgress({ current, total });
        }
      );

      setSendResult({
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors
      });

      if (result.errorCount === 0) {
        toast({
          title: "✅ Comprobantes enviados",
          description: `Se enviaron ${result.successCount} comprobantes exitosamente.`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "⚠️ Envío completado con errores",
          description: `Se enviaron ${result.successCount} de ${result.totalCount}. ${result.errorCount} fallaron.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending vouchers:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al enviar los comprobantes.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleGoToHistory = () => {
    onClose();
    navigate(periodId ? `/modules/payroll-history/${periodId}` : '/modules/payroll-history');
  };
  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-md"
      closeOnEscape={true}
      closeOnBackdrop={true}
    >
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-4">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>

        {/* Title */}
        <CustomModalHeader className="border-none pb-0">
          <CustomModalTitle className="text-xl font-semibold text-center">
            Nómina liquidada exitosamente
          </CustomModalTitle>
        </CustomModalHeader>

        {/* Period Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Período liquidado</span>
          </div>
          <div className="text-lg font-medium text-foreground">
            {formatDate(periodData.startDate)} - {formatDate(periodData.endDate)}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4 py-4 border-t border-b border-border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Empleados procesados</span>
              <div className="font-medium">
                {loadingSummary ? 'Consolidando...' : 
                 dbSummary ? dbSummary.employeesCount : 
                 'Sin datos disponibles'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Neto a pagar</span>
              <div className="font-medium">
                {loadingSummary ? 'Consolidando...' : 
                 dbSummary ? formatCurrency(dbSummary.totalNet) : 
                 'Sin datos disponibles'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!sendResult && !isSending && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cerrar
            </Button>
            <Button onClick={handleSendVouchers} className="flex-1" disabled={isSending}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar comprobantes
            </Button>
          </div>
        )}

        {/* Estado: enviando */}
        {isSending && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Enviando comprobantes...</span>
              <span className="font-medium">{sendProgress.current} de {sendProgress.total}</span>
            </div>
            <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">Por favor espere...</p>
          </div>
        )}

        {/* Estado: después de enviar */}
        {sendResult && !isSending && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700">Envío completado</p>
                  <p className="text-blue-600">
                    ✅ {sendResult.successCount} enviados exitosamente
                    {sendResult.errorCount > 0 && ` • ❌ ${sendResult.errorCount} fallidos`}
                  </p>
                </div>
              </div>
            </div>
            
            {sendResult.errorCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg max-h-32 overflow-y-auto">
                <p className="font-medium text-orange-700 text-sm mb-2">Errores:</p>
                <ul className="text-xs text-orange-600 space-y-1">
                  {sendResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>• {err.employeeName}: {err.error}</li>
                  ))}
                  {sendResult.errors.length > 5 && (
                    <li className="font-medium">... y {sendResult.errors.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}
            
            <Button onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </CustomModal>
  );
};