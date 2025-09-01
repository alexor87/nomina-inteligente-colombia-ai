
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileUploadStep } from './import/FileUploadStep';
import { ColumnMappingStep } from './import/ColumnMappingStep';
import { ValidationPreviewStep } from './import/ValidationPreviewStep';
import { ImportConfirmationStep } from './import/ImportConfirmationStep';


export interface ImportedRow {
  [key: string]: any;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  isRequired: boolean;
  validation?: 'valid' | 'warning' | 'error';
  validationMessage?: string;
}

export interface ImportData {
  validRows: any[];
  invalidRows: any[];
  mapping: Record<string, string>;
  totalRows: number;
}

export interface ImportStep {
  step: 'upload' | 'mapping' | 'validation' | 'confirmation';
  data?: {
    file?: File;
    columns?: string[];
    rows?: ImportedRow[];
    mappings?: ColumnMapping[];
    validRows?: ImportedRow[];
    invalidRows?: ImportedRow[];
    errors?: string[];
    mapping?: Record<string, string>;
    totalRows?: number;
  };
}

interface ImportEmployeesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ImportEmployeesDrawer = ({ isOpen, onClose, onImportComplete }: ImportEmployeesDrawerProps) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>({ step: 'upload' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStepChange = (newStep: ImportStep) => {
    setCurrentStep(newStep);
  };

  const handleClose = () => {
    setCurrentStep({ step: 'upload' });
    setIsProcessing(false);
    onClose();
  };

  const getStepProgress = () => {
    switch (currentStep.step) {
      case 'upload': return 25;
      case 'mapping': return 50;
      case 'validation': return 75;
      case 'confirmation': return 100;
      default: return 0;
    }
  };

  const getStepTitle = () => {
    switch (currentStep.step) {
      case 'upload': return 'Subir archivo';
      case 'mapping': return 'Mapear columnas';
      case 'validation': return 'Validar datos';
      case 'confirmation': return 'Confirmar importación';
      default: return 'Importar empleados';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl">
        <SheetHeader className="border-b pb-4 mb-6">
          <SheetTitle className="text-xl font-semibold">
            Importar desde Excel o CSV
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
            <FileUploadStep
              onNext={handleStepChange}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          )}

          {currentStep.step === 'mapping' && currentStep.data && (
            <ColumnMappingStep
              data={currentStep.data}
              onNext={handleStepChange}
              onBack={() => setCurrentStep({ step: 'upload' })}
            />
          )}

          {currentStep.step === 'validation' && currentStep.data && (
            <ValidationPreviewStep
              data={currentStep.data}
              onNext={handleStepChange}
              onBack={() => setCurrentStep({ 
                step: 'mapping', 
                data: currentStep.data 
              })}
            />
          )}

          {currentStep.step === 'confirmation' && currentStep.data && (
            <ImportConfirmationStep
              data={{
                validRows: currentStep.data.validRows || [],
                invalidRows: currentStep.data.invalidRows || [],
                mapping: currentStep.data.mapping || {},
                totalRows: currentStep.data.totalRows || 0
              }}
              onComplete={() => {
                onImportComplete();
                handleClose();
              }}
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
