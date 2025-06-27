
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

interface ReopenPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  period: PayrollHistoryPeriod;
  isProcessing: boolean;
  hasVouchers?: boolean;
}

export const ReopenPeriodModal = ({
  isOpen,
  onClose,
  onConfirm,
  period,
  isProcessing,
  hasVouchers = false
}: ReopenPeriodModalProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error reopening period:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reabrir período cerrado
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            Período: <span className="font-medium text-gray-900">{period.period}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Este período ya fue cerrado y sus comprobantes fueron emitidos. 
              Si lo reabres, podrás editar los datos, recalcular nómina y generar nuevos comprobantes.
            </AlertDescription>
          </Alert>

          {hasVouchers && (
            <Alert className="border-blue-200 bg-blue-50">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Atención:</strong> Este período tenía comprobantes emitidos. 
                Si realizas cambios y vuelves a cerrar, se emitirán nuevos comprobantes 
                y los anteriores se marcarán como anulados automáticamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">¿Qué sucederá al reabrir?</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              <li>• El período cambiará al estado "Reabierto"</li>
              <li>• Podrás editar empleados y recalcular la nómina</li>
              <li>• Se registrará un log de auditoría con tu usuario</li>
              <li>• Tendrás la opción de ir directamente a liquidar</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isConfirming || isProcessing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isConfirming || isProcessing}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isConfirming || isProcessing ? 'Reabriendo...' : 'Reabrir período'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
