
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

  // Handler de prueba simple
  const handleTestClick = (buttonType: string) => {
    console.log('🧪 TEST BUTTON CLICKED:', buttonType);
    console.log('🧪 Current state:', { completionPercentage, isLoading, isDraft });
    
    // Intentar obtener el formulario
    const form = document.querySelector('form');
    console.log('🧪 Form found:', !!form);
    
    if (form) {
      console.log('🧪 Form elements:', form.elements.length);
      console.log('🧪 Form data test:', new FormData(form));
    }
    
    return true; // Indicar que el evento se manejó
  };

  const handleDraftSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔥 DRAFT BUTTON CLICKED - Starting handler');
    
    // Primero, test básico
    if (!handleTestClick('DRAFT')) return;
    
    console.log('💾 Setting draft mode to true...');
    setIsDraft(true);
    
    // Obtener y enviar el formulario
    const form = e.currentTarget.closest('form');
    console.log('🔥 Form element found:', !!form);
    
    if (form) {
      console.log('📋 About to submit form programmatically');
      
      // Intentar múltiples métodos de envío
      try {
        // Método 1: requestSubmit
        if (form.requestSubmit) {
          console.log('📋 Using requestSubmit method');
          form.requestSubmit();
        } else {
          // Método 2: submit tradicional
          console.log('📋 Using traditional submit method');
          form.submit();
        }
      } catch (error) {
        console.error('❌ Error submitting form:', error);
      }
    } else {
      console.error('❌ No form element found for draft save');
      
      // Buscar formulario por ID o clase como fallback
      const formById = document.getElementById('employee-form');
      const formByClass = document.querySelector('.employee-form');
      console.log('🔍 Fallback search - by ID:', !!formById, 'by class:', !!formByClass);
    }
  };

  const handleMainSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔥 MAIN SUBMIT BUTTON CLICKED');
    console.log('🔥 Current state - isDraft:', isDraft, 'isLoading:', isLoading, 'completion:', completionPercentage);
    
    // Test básico
    if (!handleTestClick('MAIN_SUBMIT')) return;
    
    // Asegurar que no está en modo borrador
    if (isDraft) {
      console.log('🔄 Switching from draft mode to active mode');
      setIsDraft(false);
    }
    
    // Enviar el formulario
    const form = e.currentTarget.closest('form');
    console.log('🔥 Form element found for main submit:', !!form);
    
    if (form) {
      console.log('📋 Submitting form for main action');
      try {
        if (form.requestSubmit) {
          form.requestSubmit();
        } else {
          form.submit();
        }
      } catch (error) {
        console.error('❌ Error in main submit:', error);
      }
    } else {
      console.error('❌ No form found for main submit');
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
            onClick={handleDraftSave}
            disabled={isLoading}
            className="min-w-[140px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Borrador'}
          </Button>
          
          <Button 
            type="button"
            onClick={handleMainSubmit}
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
