import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileSpreadsheet, FileText, History, Users, DollarSign } from 'lucide-react';
import { LiquidationResult } from '@/services/SocialBenefitsLiquidationService';

interface LiquidationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: LiquidationResult;
  benefitLabel: string;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onViewHistory: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const LiquidationResultModal: React.FC<LiquidationResultModalProps> = ({
  isOpen,
  onClose,
  result,
  benefitLabel,
  onExportExcel,
  onExportPDF,
  onViewHistory,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <DialogTitle className="text-2xl">¡Liquidación Completada!</DialogTitle>
          <DialogDescription>
            Se ha procesado exitosamente la liquidación de {benefitLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumen */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Empleados liquidados</span>
              </div>
              <span className="font-bold text-lg">{result.employeesCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Provisiones procesadas</span>
              </div>
              <span className="font-bold text-lg">{result.provisionsUpdated}</span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-medium">Total Liquidado</span>
              <span className="font-bold text-2xl text-green-600">
                {formatCurrency(result.totalAmount)}
              </span>
            </div>
          </div>

          {/* Período */}
          <p className="text-center text-sm text-muted-foreground">
            Período: <span className="font-medium text-foreground">{result.periodLabel}</span>
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" className="flex-1" onClick={onExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="ghost" className="flex-1" onClick={onViewHistory}>
              <History className="h-4 w-4 mr-2" />
              Ver Historial
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
