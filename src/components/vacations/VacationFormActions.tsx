
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';

interface VacationFormActionsProps {
  formData: VacationAbsenceFormData;
  isSubmitting: boolean;
  editingVacation?: VacationAbsence | null;
  onClose: () => void;
}

export const VacationFormActions = ({
  formData,
  isSubmitting,
  editingVacation,
  onClose
}: VacationFormActionsProps) => {
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const isFormValid = formData.employee_id && formData.start_date && formData.end_date;

  return (
    <div className="flex justify-end gap-3 pt-6 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        disabled={isSubmitting}
      >
        <X className="h-4 w-4 mr-2" />
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || !isFormValid}
      >
        <Save className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Guardando...' : editingVacation ? 'Actualizar' : 'Crear'}
      </Button>
    </div>
  );
};
