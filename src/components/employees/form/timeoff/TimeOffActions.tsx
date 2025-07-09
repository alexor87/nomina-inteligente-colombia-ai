
import { Button } from '@/components/ui/button';

interface TimeOffActionsProps {
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  isFormValid: boolean;
}

export const TimeOffActions = ({ onCancel, onSave, isSaving, isFormValid }: TimeOffActionsProps) => {
  return (
    <div className="flex gap-2 justify-end pt-4">
      <Button
        onClick={onCancel}
        variant="outline"
        disabled={isSaving}
      >
        Cancelar
      </Button>
      <Button
        onClick={onSave}
        disabled={isSaving || !isFormValid}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Guardando...
          </>
        ) : (
          'Guardar'
        )}
      </Button>
    </div>
  );
};
