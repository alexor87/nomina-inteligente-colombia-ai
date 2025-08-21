
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { PayrollSummary, PayrollPeriod } from '@/types/payroll';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodData?: PayrollPeriod;
  summary?: PayrollSummary;
}

export const SuccessModal = ({ 
  isOpen, 
  onClose, 
  periodData, 
  summary 
}: SuccessModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Liquidación Completada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {periodData && (
            <div>
              <h4 className="font-medium mb-2">Período Procesado</h4>
              <p className="text-sm text-gray-600">{periodData.periodo}</p>
              <p className="text-sm text-gray-600">
                {periodData.fecha_inicio} - {periodData.fecha_fin}
              </p>
            </div>
          )}
          
          {summary && (
            <div>
              <h4 className="font-medium mb-2">Resumen</h4>
              <div className="text-sm space-y-1">
                <p>Empleados procesados: {summary.totalEmployees}</p>
                <p>Total nómina: ${summary.totalGrossPay.toLocaleString()}</p>
                <p>Total deducciones: ${summary.totalDeductions.toLocaleString()}</p>
                <p>Pago neto: ${summary.totalNetPay.toLocaleString()}</p>
              </div>
            </div>
          )}
          
          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
