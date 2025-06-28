
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from "lucide-react";
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { formatPeriodDateRange } from '@/utils/periodDateUtils';

interface ReopenPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  period: PayrollHistoryPeriod | null;
  isProcessing: boolean;
}

export const ReopenPeriodModal = ({
  isOpen,
  onClose,
  onConfirm,
  period,
  isProcessing
}: ReopenPeriodModalProps) => {
  const [confirmationText, setConfirmationText] = useState('');
  
  if (!period) return null;

  const periodName = formatPeriodDateRange(period.startDate, period.endDate);
  const isConfirmationValid = confirmationText.toLowerCase() === periodName.toLowerCase();

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;
    
    try {
      await onConfirm();
      setConfirmationText('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              ¿Deseas reabrir este periodo?
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period Info */}
          <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-amber-400">
            <div className="font-medium text-gray-900">{periodName}</div>
            <div className="text-sm text-gray-600 mt-1">
              {period.employeesCount} empleados • ${new Intl.NumberFormat('es-CO').format(period.totalNetPay)}
            </div>
          </div>

          {/* Warning Text */}
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>
              Esto permitirá modificar datos del periodo cerrado. Se invalidarán los comprobantes actuales 
              y será necesario volver a cerrarlo manualmente.
            </p>
            <p className="font-medium text-amber-700">
              Esta acción se registra y no se puede deshacer.
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Para confirmar, escribe el nombre del periodo:
            </label>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={periodName}
              className="font-mono text-sm"
              disabled={isProcessing}
            />
            <div className="text-xs text-gray-500">
              Debe coincidir exactamente: <span className="font-medium">{periodName}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isConfirmationValid || isProcessing}
              className="px-4 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reabriendo...
                </>
              ) : (
                'Sí, reabrir periodo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
