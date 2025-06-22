
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

interface ReopenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  period: PayrollHistoryPeriod | null;
  isProcessing: boolean;
}

export const ReopenDialog = ({ isOpen, onClose, onConfirm, period, isProcessing }: ReopenDialogProps) => {
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    if (reason.trim()) {
      await onConfirm(reason);
      setReason('');
      onClose();
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Reabrir Período</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Advertencia Legal</p>
                <p>
                  Editar este período invalidará los archivos anteriores enviados a DIAN 
                  y puede requerir nuevas declaraciones. Esta acción quedará registrada 
                  en el historial de auditoría.
                </p>
              </div>
            </div>
          </div>

          {period && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Período a reabrir:</p>
              <p className="font-medium">{period.period}</p>
              <p className="text-sm text-gray-500">
                {period.employeesCount} empleados liquidados
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de la reapertura *</Label>
            <Textarea
              id="reason"
              placeholder="Describa el motivo por el cual necesita reabrir este período..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Este motivo quedará registrado en el historial de auditoría
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!reason.trim() || isProcessing}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Reapertura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
