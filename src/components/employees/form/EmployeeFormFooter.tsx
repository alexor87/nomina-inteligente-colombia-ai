
import { Button } from '@/components/ui/button';
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
  const handleTestSave = (buttonType: string) => {
    // Marcar como borrador si es el botón de borrador
    if (buttonType === 'DRAFT') {
      setIsDraft(true);
    } else {
      setIsDraft(false);
    }
    
    // Enviar el formulario
    const formElement = document.getElementById('employee-form') as HTMLFormElement;
    if (formElement) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      formElement.dispatchEvent(submitEvent);
    }
  };

  const isMainButtonDisabled = isLoading || (completionPercentage < 100 && !employee && !isDraft);

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm text-gray-600">
            Progreso: {completionPercentage}% completado
          </span>
        </div>
        
        <div className="flex gap-3">
          {!employee && (
            <Button 
              type="button"
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTestSave('DRAFT');
              }}
              disabled={isLoading}
              className="min-w-[140px]"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Borrador'}
            </Button>
          )}
          
          <Button 
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
