import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { NoveltyFileUploadStep, ImportStep } from './NoveltyFileUploadStep';
import { NoveltyColumnMappingStep } from './NoveltyColumnMappingStep';
import { NoveltyValidationPreviewStep } from './NoveltyValidationPreviewStep';
import { NoveltyImportConfirmationStep } from './NoveltyImportConfirmationStep';

interface NoveltyImportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  companyId: string;
  periodId: string;
  periodStartDate: string;
  periodEndDate: string;
}

export const NoveltyImportDrawer = ({ 
  isOpen, 
  onClose, 
  onImportComplete, 
  companyId,
  periodId,
  periodStartDate,
  periodEndDate 
}: NoveltyImportDrawerProps) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>({ step: 'upload' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStepChange = (newStep: ImportStep) => {
    setCurrentStep(newStep);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setCurrentStep({ step: 'upload' });
      onClose();
    }
  };

  const handleImportComplete = () => {
    setCurrentStep({ step: 'upload' });
    onImportComplete();
  };

  const getStepTitle = () => {
    switch (currentStep.step) {
      case 'upload':
        return 'Subir Archivo';
      case 'mapping':
        return 'Mapear Columnas';
      case 'validation':
        return 'Validar Datos';
      case 'confirmation':
        return 'Confirmar Importación';
      default:
        return 'Importar Novedades';
    }
  };

  const getStepProgress = () => {
    switch (currentStep.step) {
      case 'upload':
        return 25;
      case 'mapping':
        return 50;
      case 'validation':
        return 75;
      case 'confirmation':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl">
        <SheetHeader className="border-b pb-4 mb-6">
          <SheetTitle className="text-xl font-semibold">
            Importar Novedades Masivamente
          </SheetTitle>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{getStepTitle()}</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        </SheetHeader>

        <div className="h-full overflow-y-auto pb-20">
          {currentStep.step === 'upload' && (
            <NoveltyFileUploadStep
              onNext={handleStepChange}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          )}

          {currentStep.step === 'mapping' && currentStep.data && (
            <NoveltyColumnMappingStep
              data={currentStep.data}
              onNext={handleStepChange}
              onBack={() => setCurrentStep({ step: 'upload' })}
            />
          )}

          {currentStep.step === 'validation' && currentStep.data && (
            <NoveltyValidationPreviewStep
              data={currentStep.data}
              onNext={handleStepChange}
              onBack={() => setCurrentStep({ 
                step: 'mapping', 
                data: currentStep.data 
              })}
              companyId={companyId}
              periodStartDate={periodStartDate}
              periodEndDate={periodEndDate}
            />
          )}

          {currentStep.step === 'confirmation' && currentStep.data && (
            <NoveltyImportConfirmationStep
              data={currentStep.data}
              onComplete={handleImportComplete}
              onBack={() => setCurrentStep({ 
                step: 'validation', 
                data: currentStep.data 
              })}
              companyId={companyId}
              periodId={periodId}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};