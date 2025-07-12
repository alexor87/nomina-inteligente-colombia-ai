
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Save } from 'lucide-react';
import { Employee } from '@/types';

interface EmployeeFormFooterProps {
  employee?: Employee;
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
  const handleDraftSave = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('💾 Saving as draft...');
    // This will trigger form submission with draft flag
    setIsDraft(true);
    // Submit the form programmatically
    const form = e.currentTarget.closest('form');
    if (form) {
      form.requestSubmit();
    }
  };

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
              onCheckedChange={setIsDraft}
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
          
          {!isDraft && (
            <Button 
              type="submit"
              disabled={isLoading || completionPercentage < 80}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : employee ? 'Actualizar y Activar' : 'Crear y Activar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
