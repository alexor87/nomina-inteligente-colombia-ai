
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

  const handleDraftSave = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🔥 DRAFT BUTTON CLICKED');
    console.log('💾 Setting draft mode and submitting...');
    
    setIsDraft(true);
    
    // Get the form element and submit it
    const form = e.currentTarget.closest('form');
    console.log('🔥 Form element found:', !!form);
    
    if (form) {
      console.log('📋 Submitting form programmatically');
      form.requestSubmit();
    } else {
      console.error('❌ No form element found for draft save');
    }
  };

  const isMainButtonDisabled = isLoading || (completionPercentage < 80 && !isDraft);
  console.log('🔥 Main button disabled?', isMainButtonDisabled, 'Reason: loading=', isLoading, 'completion=', completionPercentage);

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
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Borrador
          </Button>
          
          <Button 
            type="submit"
            disabled={isMainButtonDisabled}
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              console.log('🔥 MAIN SUBMIT BUTTON CLICKED');
              console.log('🔥 Current state - isDraft:', isDraft, 'isLoading:', isLoading);
            }}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isLoading ? 'Guardando...' : employee ? 'Actualizar y Activar' : 'Crear y Activar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
