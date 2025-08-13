
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NovedadesFileUploadStep } from './NovedadesFileUploadStep';
import { NovedadesMappingStep } from './NovedadesMappingStep';
import { NovedadesValidationPreviewStep } from './NovedadesValidationPreviewStep';
import { NovedadesImportResultStep } from './NovedadesImportResultStep';
import { X } from 'lucide-react';

export interface ImportedNovedadRow {
  [key: string]: any;
}

export interface NovedadColumnMapping {
  sourceColumn: string;
  targetField: string;
  isRequired: boolean;
  validation?: 'valid' | 'warning' | 'error';
  validationMessage?: string;
}

export interface NovedadImportData {
  validRows: any[];
  invalidRows: any[];
  mapping: Record<string, string>;
  totalRows: number;
}

export interface NovedadImportStep {
  step: 'upload' | 'mapping' | 'validation' | 'result';
  data?: {
    file?: File;
    columns?: string[];
    rows?: ImportedNovedadRow[];
    mappings?: NovedadColumnMapping[];
    validRows?: ImportedNovedadRow[];
    invalidRows?: ImportedNovedadRow[];
    errors?: string[];
    mapping?: Record<string, string>;
    totalRows?: number;
    importResult?: {
      success: number;
      errors: number;
      employeesAffected: number;
    };
  };
}

interface ImportNovedadesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  periodId: string;
}

export const ImportNovedadesDrawer = ({ 
  isOpen, 
  onClose, 
  onImportComplete,
  periodId 
}: ImportNovedadesDrawerProps) => {
  const [currentStep, setCurrentStep] = useState<NovedadImportStep>({ step: 'upload' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStepChange = (newStep: NovedadImportStep) => {
    setCurrentStep(newStep);
  };

  const handleClose = () => {
    setCurrentStep({ step: 'upload' });
    setIsProcessing(false);
    onClose();
  };

  const handleImportComplete = () => {
    onImportComplete();
    handleClose();
  };

  const getStepProgress = () => {
    switch (currentStep.step) {
      case 'upload': return 25;
      case 'mapping': return 50;
      case 'validation': return 75;
      case 'result': return 100;
      default: return 0;
    }
  };

  const getStepTitle = () => {
    switch (currentStep.step) {
      case 'upload': return 'Subir archivo';
      case 'mapping': return 'Mapear columnas';
      case 'validation': return 'Validar y previsualizar';
      case 'result': return 'Resultado de importación';
      default: return 'Importar novedades';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-5xl">
        <SheetHeader className="border-b pb-4 mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">
              Importar Novedades desde Excel o CSV
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
            <NovedadesFileUploadStep
              onNext={handleStepChange}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          )}

          {currentStep.step === 'mapping' && currentStep.data && (
            <NovedadesMappingStep
              data={currentStep.data}
              onNext={handleStepChange}
              onBack={() => setCurrentStep({ step: 'upload' })}
            />
          )}

          {currentStep.step === 'validation' && currentStep.data && (
            <NovedadesValidationPreviewStep
              data={currentStep.data}
              periodId={periodId}
              onNext={handleStepChange}
              onBack={() => setCurrentStep({ 
                step: 'mapping', 
                data: currentStep.data 
              })}
            />
          )}

          {currentStep.step === 'result' && currentStep.data && (
            <NovedadesImportResultStep
              data={{
                validRows: currentStep.data.validRows || [],
                invalidRows: currentStep.data.invalidRows || [],
                mapping: currentStep.data.mapping || {},
                totalRows: currentStep.data.totalRows || 0,
                importResult: currentStep.data.importResult
              }}
              onComplete={handleImportComplete}
              onBack={() => setCurrentStep({ 
                step: 'validation', 
                data: currentStep.data 
              })}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
