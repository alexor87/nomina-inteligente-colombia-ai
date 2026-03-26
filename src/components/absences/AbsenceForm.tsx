
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { VacationAbsence, VacationAbsenceFormData, requiresSubtype } from '@/types/vacations';
import { CalendarDays } from 'lucide-react';
import { useVacationAbsenceForm } from '@/hooks/useVacationAbsenceForm';
import { useVacationEmployees } from '@/hooks/useVacationEmployees';
import { AbsenceFormFields } from './AbsenceFormFields';
import { AbsenceFormActions } from './AbsenceFormActions';
import { isValidDateRange } from '@/utils/dateUtils';

interface AbsenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VacationAbsenceFormData, periodInfo?: any) => Promise<void>;
  editingVacation?: VacationAbsence | null;
  isSubmitting?: boolean;
  preselectedEmployeeId?: string;
  useCustomModal?: boolean;
  hideEmployeeSelection?: boolean;
}

export const AbsenceForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingVacation,
  isSubmitting = false,
  preselectedEmployeeId,
  useCustomModal = true,
  hideEmployeeSelection = false
}: AbsenceFormProps) => {
  const {
    formData,
    setFormData,
    calculatedDays,
    periodInfo,
    isDetectingPeriod
  } = useVacationAbsenceForm(editingVacation, isOpen, preselectedEmployeeId);

  const { data: employees = [] } = useVacationEmployees(isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.type || !formData.start_date || !formData.end_date) {
      return;
    }

    // Verificar subtipo si es requerido
    if (requiresSubtype(formData.type) && !formData.subtipo) {
      alert('El subtipo es requerido para este tipo de ausencia');
      return;
    }

    // Use the centralized date validation utility
    if (!isValidDateRange(formData.start_date, formData.end_date)) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    // Validacion: Verificar que tengamos un periodo valido para nuevas ausencias
    if (!editingVacation && (!periodInfo || !periodInfo.periodId)) {
      alert('No se pudo determinar un periodo valido para las fechas seleccionadas. Por favor, seleccione fechas diferentes.');
      return;
    }

    try {
      await onSubmit(formData, periodInfo);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  // Contenido del formulario
  const formContent = (
    <>
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays className="h-5 w-5" />
        <h3 className="text-lg font-semibold">
          {editingVacation ? 'Editar Ausencia' : 'Nueva Ausencia'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AbsenceFormFields
          formData={formData}
          setFormData={setFormData}
          employees={employees}
          calculatedDays={calculatedDays}
          isSubmitting={isSubmitting}
          periodInfo={periodInfo}
          isDetectingPeriod={isDetectingPeriod}
          hideEmployeeSelection={hideEmployeeSelection}
        />

        <AbsenceFormActions
          formData={formData}
          isSubmitting={isSubmitting}
          editingVacation={editingVacation}
          onClose={onClose}
        />
      </form>
    </>
  );

  // Si useCustomModal es false, devolver solo el contenido
  if (!useCustomModal) {
    return <div className="space-y-6">{formContent}</div>;
  }

  // Comportamiento normal: Con CustomModal wrapper
  return (
    <CustomModal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {editingVacation ? 'Editar Ausencia' : 'Nueva Ausencia'}
        </CustomModalTitle>
      </CustomModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        <AbsenceFormFields
          formData={formData}
          setFormData={setFormData}
          employees={employees}
          calculatedDays={calculatedDays}
          isSubmitting={isSubmitting}
          periodInfo={periodInfo}
          isDetectingPeriod={isDetectingPeriod}
          hideEmployeeSelection={hideEmployeeSelection}
        />

        <AbsenceFormActions
          formData={formData}
          isSubmitting={isSubmitting}
          editingVacation={editingVacation}
          onClose={onClose}
        />
      </form>
    </CustomModal>
  );
};
