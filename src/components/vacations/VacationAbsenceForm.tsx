
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';
import { CalendarDays } from 'lucide-react';
import { useVacationAbsenceForm } from '@/hooks/useVacationAbsenceForm';
import { useVacationEmployees } from '@/hooks/useVacationEmployees';
import { VacationFormFields } from './VacationFormFields';
import { VacationFormActions } from './VacationFormActions';

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
    
    // ✅ ACTUALIZADO: Validar tipo también
    if (!formData.employee_id || !formData.type || !formData.start_date || !formData.end_date) {
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
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
