
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollSummary } from '@/types/payroll';

interface PayrollSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodData: {
    startDate: string;
    endDate: string;
    type: string;
  };
  summary: PayrollSummary;
}

export const PayrollSuccessModal: React.FC<PayrollSuccessModalProps> = ({
  isOpen,
  onClose,
  periodData,
  summary
}) => {
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

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Vouchers
            </Button>
            <Button 
              onClick={onClose}
              className="flex-1"
            >
              Continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
