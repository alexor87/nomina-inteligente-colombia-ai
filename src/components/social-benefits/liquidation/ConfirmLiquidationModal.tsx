import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmLiquidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  benefitLabel: string;
  employeesCount: number;
  totalAmount: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const ConfirmLiquidationModal: React.FC<ConfirmLiquidationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  benefitLabel,
  employeesCount,
  totalAmount,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Confirmar Liquidación
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              Estás a punto de liquidar la <strong>{benefitLabel.toLowerCase()}</strong> de{' '}
              <strong>{employeesCount} {employeesCount === 1 ? 'persona' : 'personas'}</strong>.
            </p>
            <p className="text-lg font-semibold text-foreground">
              Total a liquidar: {formatCurrency(totalAmount)}
            </p>
            <p className="text-sm">
              Al realizar esta liquidación se incluirá el valor de la {benefitLabel.toLowerCase()} en las colillas de pago y en el archivo de pago en bancos.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Liquidando...
              </>
            ) : (
              `Liquidar ${benefitLabel.toLowerCase()}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
