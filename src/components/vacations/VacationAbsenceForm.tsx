
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { VacationAbsence, VacationAbsenceFormData, requiresSubtype } from '@/types/vacations';
import { CalendarDays } from 'lucide-react';
import { useVacationAbsenceForm } from '@/hooks/useVacationAbsenceForm';
import { useVacationEmployees } from '@/hooks/useVacationEmployees';
import { VacationFormFields } from './VacationFormFields';
import { VacationFormActions } from './VacationFormActions';
import { isValidDateRange } from '@/utils/dateUtils';

interface VacationAbsenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VacationAbsenceFormData) => Promise<void>;
  editingVacation?: VacationAbsence | null;
  isSubmitting?: boolean;
}

export const VacationAbsenceForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingVacation,
  isSubmitting = false
}: VacationAbsenceFormProps) => {
  const { formData, setFormData, calculatedDays } = useVacationAbsenceForm(editingVacation, isOpen);
  const { data: employees = [] } = useVacationEmployees(isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.type || !formData.start_date || !formData.end_date) {
      return;
    }

    // ✅ VALIDACIÓN KISS: Verificar subtipo si es requerido
    if (requiresSubtype(formData.type) && !formData.subtipo) {
      alert('El subtipo es requerido para este tipo de ausencia');
      return;
    }

    // Use the centralized date validation utility
    if (!isValidDateRange(formData.start_date, formData.end_date)) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {editingVacation ? 'Editar Ausencia' : 'Nueva Ausencia'}
        </CustomModalTitle>
      </CustomModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        <VacationFormFields
          formData={formData}
          setFormData={setFormData}
          employees={employees}
          calculatedDays={calculatedDays}
          isSubmitting={isSubmitting}
        />

        <VacationFormActions
          formData={formData}
          isSubmitting={isSubmitting}
          editingVacation={editingVacation}
          onClose={onClose}
        />
      </form>
    </CustomModal>
  );
};
