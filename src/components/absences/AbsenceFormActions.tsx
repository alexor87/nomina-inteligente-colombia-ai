
import { Button } from '@/components/ui/button';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';

interface AbsenceFormActionsProps {
  formData: VacationAbsenceFormData;
  isSubmitting: boolean;
  editingVacation?: VacationAbsence | null;
  onClose: () => void;
}

export const AbsenceFormActions = ({
  formData,
  isSubmitting,
  editingVacation,
  onClose
}: AbsenceFormActionsProps) => {
  const isFormValid = formData.employee_id && formData.type && formData.start_date && formData.end_date;

  return (
    <div className="flex justify-end space-x-4 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="min-w-[120px]"
      >
        {isSubmitting ? 'Guardando...' : editingVacation ? 'Actualizar' : 'Crear'}
      </Button>
    </div>
  );
};
