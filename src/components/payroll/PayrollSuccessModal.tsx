
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Calculator } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { PayrollSummary } from '@/types/payroll';
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
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [sendResult, setSendResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: Array<{ employeeId: string; employeeName: string; error: string }>;
  } | null>(null);

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

      // Mostrar toast de resumen
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

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <DialogTitle className="text-xl font-semibold text-green-700">
            ¡Liquidación Completada!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              Período: {new Date(periodData.startDate).toLocaleDateString()} - {new Date(periodData.endDate).toLocaleDateString()}
            </p>
            <p className="text-gray-600">
              Tipo: {periodData.type}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Empleados procesados:</span>
              <span className="font-medium">{summary.totalEmployees}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total devengado:</span>
              <span className="font-medium text-green-600">{formatCurrency(summary.totalGrossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total deducciones:</span>
              <span className="font-medium text-red-600">{formatCurrency(summary.totalDeductions)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-lg font-semibold">
              <span>Neto a pagar:</span>
              <span className="text-blue-600">{formatCurrency(summary.totalNetPay)}</span>
            </div>
          </div>

          {/* Provisiones automáticas confirmación */}
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Calculator className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-700">Provisiones Automáticas</p>
                <p className="text-green-600">
                  Las provisiones de prestaciones sociales se calcularon y registraron automáticamente para este período.
                </p>
              </div>
            </div>
          </div>

          {/* Estado inicial: antes de enviar */}
          {!sendResult && !isSending && (
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onClose}
              >
                Cerrar
              </Button>
              <Button 
                onClick={handleSendVouchers}
                className="flex-1"
                disabled={isSending}
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar comprobantes
              </Button>
            </div>
          )}

          {/* Estado: enviando */}
          {isSending && (
            <div className="space-y-3 pt-4">
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
            <div className="space-y-4 pt-4">
              {/* Resumen de envío */}
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
              
              {/* Mostrar errores si hay */}
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
              
              {/* Botón de cerrar */}
              <Button onClick={onClose} className="w-full">
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
