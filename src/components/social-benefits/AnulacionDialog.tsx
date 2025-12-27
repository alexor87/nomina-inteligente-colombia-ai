import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { SocialBenefitsLiquidationService, PaymentHistoryItem } from '@/services/SocialBenefitsLiquidationService';
import { useToast } from '@/hooks/use-toast';

interface AnulacionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentHistoryItem;
  onSuccess: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const BENEFIT_LABELS: Record<string, string> = {
  prima: 'Prima de Servicios',
  cesantias: 'Cesantías',
  intereses_cesantias: 'Intereses de Cesantías',
  vacaciones: 'Vacaciones',
};

export const AnulacionDialog: React.FC<AnulacionDialogProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAnular = async () => {
    if (motivo.trim().length < 10) {
      toast({
        title: 'Motivo requerido',
        description: 'El motivo de anulación debe tener al menos 10 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await SocialBenefitsLiquidationService.anularLiquidacion(
        payment.id,
        motivo.trim()
      );

      if (result.success) {
        toast({
          title: 'Liquidación anulada',
          description: `Se anuló la liquidación de ${BENEFIT_LABELS[payment.benefit_type]} - ${payment.period_label}`,
        });
        setMotivo('');
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo anular la liquidación',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al anular la liquidación',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setMotivo('');
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Anular Liquidación
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Está a punto de anular la siguiente liquidación. Esta acción revertirá
                las provisiones a estado "calculado" y podrán ser liquidadas nuevamente.
              </p>
              <div className="bg-muted rounded-lg p-4 space-y-2 text-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{BENEFIT_LABELS[payment.benefit_type]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="font-medium">{payment.period_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empleados:</span>
                  <span className="font-medium">{payment.employees_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-bold text-green-600">{formatCurrency(payment.total_amount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivo" className="text-foreground">
                  Motivo de anulación <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="motivo"
                  placeholder="Ingrese el motivo de la anulación (mínimo 10 caracteres)..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={isProcessing}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {motivo.length}/10 caracteres mínimos
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing} onClick={handleClose}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAnular}
            disabled={isProcessing || motivo.trim().length < 10}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Anulando...
              </>
            ) : (
              'Confirmar Anulación'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
