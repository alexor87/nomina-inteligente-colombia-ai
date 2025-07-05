
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { formatPeriodDateRange } from '@/utils/periodDateUtils';

interface AutoLiquidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLiquidation: () => void;
  period: PayrollHistoryPeriod | null;
}

export const AutoLiquidationModal = ({
  isOpen,
  onClose,
  onGoToLiquidation,
  period
}: AutoLiquidationModalProps) => {
  if (!period) return null;

  const periodName = formatPeriodDateRange(period.startDate, period.endDate);

  const handleGoToLiquidation = () => {
    onGoToLiquidation();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Periodo reabierto exitosamente
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success Message */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-green-900">
                  {periodName} está listo para edición
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Ahora puedes modificar novedades, empleados y recalcular valores
                </div>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <div className="font-medium text-amber-900">
                  Importante recordar
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  • Los comprobantes anteriores han sido invalidados<br />
                  • Debes cerrar el periodo nuevamente cuando termines<br />
                  • Todas las modificaciones quedan registradas
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-4"
            >
              Continuar más tarde
            </Button>
            <Button
              onClick={handleGoToLiquidation}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Ir a Liquidar Nómina
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
