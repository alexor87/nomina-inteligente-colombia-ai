import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, AlertTriangle } from 'lucide-react';
import { EditWizardSteps } from '@/types/payroll-history';

interface EditWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (steps: EditWizardSteps) => Promise<void>;
  isProcessing: boolean;
}

export const EditWizard = ({ isOpen, onClose, onConfirm, isProcessing }: EditWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardSteps, setWizardSteps] = useState<EditWizardSteps>({
    pilaFile: { regenerate: false },
    payslips: { update: false }
  });

  const handleStepChange = (step: keyof EditWizardSteps, field: string, value: boolean) => {
    setWizardSteps(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value
      }
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = async () => {
    await onConfirm(wizardSteps);
    onClose();
    setCurrentStep(1);
    setWizardSteps({
      pilaFile: { regenerate: false },
      payslips: { update: false }
    });
  };

  const getTotalTasks = () => {
    let count = 0;
    if (wizardSteps.pilaFile.regenerate) count++;
    if (wizardSteps.payslips.update) count++;
    return count;
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return "Configure si desea regenerar el archivo PILA con los cambios realizados en el período.";
      case 2:
        return "Configure si desea actualizar y regenerar los comprobantes de pago para reflejar los cambios.";
      case 3:
        return "Revise las acciones que se realizarán antes de confirmar el procesamiento del período editado.";
      default:
        return "Asistente para procesar un período de nómina que ha sido editado.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Procesar Período Editado</span>
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
              </div>
            ))}
          </div>

          {/* Step 1: PILA File */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Archivo PILA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  ¿Desea regenerar el archivo PILA con los cambios realizados?
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="regenerate-pila"
                    checked={wizardSteps.pilaFile.regenerate}
                    onCheckedChange={(checked) => handleStepChange('pilaFile', 'regenerate', !!checked)}
                  />
                  <label htmlFor="regenerate-pila" className="text-sm font-medium">
                    Sí, regenerar archivo PILA
                  </label>
                </div>
                {wizardSteps.pilaFile.regenerate && (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ El archivo PILA anterior será reemplazado. Asegúrese de que no haya sido enviado aún.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payslips */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5 text-purple-600" />
                  <span>Comprobantes de Pago</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  ¿Desea actualizar y regenerar los comprobantes de pago?
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-payslips"
                    checked={wizardSteps.payslips.update}
                    onCheckedChange={(checked) => handleStepChange('payslips', 'update', !!checked)}
                  />
                  <label htmlFor="update-payslips" className="text-sm font-medium">
                    Sí, actualizar comprobantes
                  </label>
                </div>
                {wizardSteps.payslips.update && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ Se generarán nuevos comprobantes con los montos actualizados.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Summary */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Se realizarán las siguientes acciones:
                </p>
                <div className="space-y-2">
                  {wizardSteps.pilaFile.regenerate && (
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-blue-100 text-blue-800">PILA</Badge>
                      <span className="text-sm">Regenerar archivo PILA</span>
                    </div>
                  )}
                  {wizardSteps.payslips.update && (
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-purple-100 text-purple-800">Comprobantes</Badge>
                      <span className="text-sm">Actualizar comprobantes de pago</span>
                    </div>
                  )}
                  {getTotalTasks() === 0 && (
                    <p className="text-gray-500 text-sm">No se realizarán acciones automáticas.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 1 || isProcessing}
            >
              Anterior
            </Button>
            
            <div className="text-sm text-gray-500">
              Paso {currentStep} de 3
            </div>

            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={isProcessing}>
                Siguiente
              </Button>
            ) : (
              <Button 
                onClick={handleConfirm} 
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? 'Procesando...' : 'Confirmar y Procesar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
