
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Save } from 'lucide-react';
import { EmployeeUnified } from '@/types/employee-unified';

interface EmployeeFormFooterProps {
  employee?: EmployeeUnified;
  completionPercentage: number;
  isDraft: boolean;
  setIsDraft: (value: boolean) => void;
  isLoading: boolean;
}

export const EmployeeFormFooter = ({
  employee,
  completionPercentage,
  isDraft,
  setIsDraft,
  isLoading
}: EmployeeFormFooterProps) => {
  console.log('🔥 FOOTER RENDER - Completion:', completionPercentage, 'IsLoading:', isLoading, 'IsDraft:', isDraft);

  // Handler simplificado para testing
  const handleTestSave = (buttonType: string) => {
    console.log('🚀 SIMPLIFIED BUTTON CLICK:', buttonType);
    console.log('🚀 Current state:', { completionPercentage, isLoading, isDraft });
    
    // Marcar como borrador si es el botón de borrador
    if (buttonType === 'DRAFT') {
      console.log('💾 Setting draft mode to true...');
      setIsDraft(true);
    } else {
      console.log('✅ Setting draft mode to false...');
      setIsDraft(false);
    }
    
    // Intentar enviar el formulario de manera directa
    const formElement = document.getElementById('employee-form') as HTMLFormElement;
    console.log('📋 Form element found:', !!formElement);
    
    if (formElement) {
      console.log('📋 Attempting to submit form programmatically');
      // Crear y disparar evento de submit
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      formElement.dispatchEvent(submitEvent);
    } else {
      console.error('❌ Form element not found');
    }
  };

  const isMainButtonDisabled = isLoading || (completionPercentage < 80 && !isDraft);
  console.log('🔥 Main button disabled?', isMainButtonDisabled, 'Reasons:', {
    isLoading,
    completionTooLow: completionPercentage < 80 && !isDraft,
    completionPercentage
  });

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">
              Progreso: {completionPercentage}% completado
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="isDraft"
              checked={isDraft}
              onCheckedChange={(checked) => {
                console.log('🔥 Switch changed to:', checked);
                setIsDraft(checked);
              }}
            />
            <Label htmlFor="isDraft" className="text-sm">Guardar como borrador</Label>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            type="button"
            variant="outline" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔥 DRAFT BUTTON CLICKED - Direct handler');
              handleTestSave('DRAFT');
            }}
            disabled={isLoading}
            className="min-w-[140px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Borrador'}
          </Button>
          
          <Button 
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔥 MAIN SUBMIT BUTTON CLICKED - Direct handler');
              handleTestSave('MAIN_SUBMIT');
            }}
            disabled={isMainButtonDisabled}
            className="bg-blue-600 hover:bg-blue-700 min-w-[160px]"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isLoading ? 'Guardando...' : employee ? 'Actualizar y Activar' : 'Crear y Activar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
