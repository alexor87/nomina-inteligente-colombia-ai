
/**
 * ✏️ MODAL DE EDICIÓN DE PERÍODO - ALELUYA
 * Reapertura profesional de períodos con auditoría
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface EditPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  onSubmit: (periodId: string, changes: {
    reason: string;
    employeeChanges?: Array<{
      employeeId: string;
      newSalary?: number;
      newDeductions?: number;
    }>;
  }) => Promise<void>;
  isLoading: boolean;
}

export const EditPeriodModal: React.FC<EditPeriodModalProps> = ({
  isOpen,
  onClose,
  periodId,
  onSubmit,
  isLoading
}) => {
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'reason' | 'confirm' | 'processing' | 'success'>('reason');

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    
    setStep('processing');
    
    try {
      await onSubmit(periodId, { reason });
      setStep('success');
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      setStep('reason');
    }
  };

  const handleClose = () => {
    setReason('');
    setStep('reason');
    onClose();
  };

  const proceedToConfirm = () => {
    if (reason.trim()) {
      setStep('confirm');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Editar Período Cerrado</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'reason' && (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Estás por reabrir un período cerrado. 
                Esta acción quedará registrada en el sistema de auditoría.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Motivo de la Edición</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reason">
                    Describe el motivo por el cual necesitas editar este período *
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Ej: Corrección de salario por error en cálculo, ajuste por novedad no aplicada, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Este motivo será registrado en el log de auditoría
                  </p>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={proceedToConfirm}
                disabled={!reason.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Confirmación requerida:</strong> Vas a reabrir el período para edición.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de la Acción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Motivo registrado:</h4>
                  <p className="text-gray-700 italic">"{reason}"</p>
                </div>

                <div className="space-y-2 text-sm">
                  <p>✅ El período será reabierto temporalmente</p>
                  <p>✅ Podrás realizar los cambios necesarios</p>
                  <p>✅ La acción quedará registrada en auditoría</p>
                  <p>✅ El período se puede cerrar nuevamente después</p>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setStep('reason')}
              >
                Regresar
              </Button>
              <Button 
                onClick={handleSubmit}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmar Reapertura
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-medium">Reabriendo período...</h3>
              <p className="text-gray-600">
                Aplicando cambios y registrando en auditoría
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-medium text-green-800">
                ¡Período reabierto exitosamente!
              </h3>
              <p className="text-gray-600">
                Ahora puedes realizar las ediciones necesarias
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
