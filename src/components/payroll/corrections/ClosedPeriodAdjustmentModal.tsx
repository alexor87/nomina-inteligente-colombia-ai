import React, { useState } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Zap } from 'lucide-react';

interface ClosedPeriodAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentData) => void;
  employeeName: string;
  periodName: string;
  periodStatus: string;
}

export interface AdjustmentData {
  adjustmentType: 'correctivo' | 'compensatorio';
  concept: string;
  amount: number;
  justification: string;
}

export const ClosedPeriodAdjustmentModal: React.FC<ClosedPeriodAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employeeName,
  periodName,
  periodStatus
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'correctivo' | 'compensatorio'>('compensatorio');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !amount || (adjustmentType === 'correctivo' && !justification)) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        adjustmentType,
        concept,
        amount: parseFloat(amount),
        justification
      });
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error submitting adjustment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAdjustmentType('compensatorio');
    setConcept('');
    setAmount('');
    setJustification('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <CustomModal isOpen={isOpen} onClose={handleClose} className="max-w-2xl">
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Ajuste a Período Cerrado
        </CustomModalTitle>
      </CustomModalHeader>

      <div className="space-y-6">
        {/* Period Info */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Período: {periodName}</span>
            <Badge variant={periodStatus === 'cerrado' ? 'destructive' : 'secondary'}>
              {periodStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Empleado: <span className="font-medium">{employeeName}</span>
          </p>
        </div>

        {/* Adjustment Type Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Tipo de Ajuste</Label>
          <RadioGroup value={adjustmentType} onValueChange={(value: 'correctivo' | 'compensatorio') => setAdjustmentType(value)}>
            
            {/* Compensatorio Option */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="compensatorio" id="compensatorio" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <Label htmlFor="compensatorio" className="font-medium text-primary">
                    Compensatorio (Recomendado)
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Aplica el ajuste en el próximo período activo. Mantiene la integridad del período cerrado y es la práctica más segura.
                </p>
              </div>
            </div>

            {/* Correctivo Option */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="correctivo" id="correctivo" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <Label htmlFor="correctivo" className="font-medium text-warning">
                    Correctivo (Requiere Justificación)
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Modifica directamente el período cerrado. Afecta reportes históricos y requiere regenerar comprobantes.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Warning for Corrective */}
        {adjustmentType === 'correctivo' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Advertencia:</strong> Los ajustes correctivos modifican datos históricos y pueden afectar 
              reportes contables. Se requiere justificación detallada para auditoría.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto</Label>
              <Input
                id="concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Horas extra, Prima, Descuento..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {adjustmentType === 'correctivo' && (
            <div className="space-y-2">
              <Label htmlFor="justification">Justificación (Obligatoria)</Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describa la razón del ajuste correctivo, error encontrado, autorización recibida, etc."
                rows={3}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !concept || !amount || (adjustmentType === 'correctivo' && !justification)}
            >
              {isSubmitting ? 'Procesando...' : 'Aplicar Ajuste'}
            </Button>
          </div>
        </form>
      </div>
    </CustomModal>
  );
};