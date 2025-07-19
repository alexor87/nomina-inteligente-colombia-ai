
import { useState, useEffect } from 'react';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';

export const useVacationAbsenceForm = (editingVacation: VacationAbsence | null, isOpen: boolean) => {
  const [formData, setFormData] = useState<VacationAbsenceFormData>({
    employee_id: '',
    type: 'vacaciones',
    start_date: '',
    end_date: '',
    observations: ''
  });

  // Reset form when modal opens/closes or editing vacation changes
  useEffect(() => {
    if (isOpen) {
      if (editingVacation) {
        setFormData({
          employee_id: editingVacation.employee_id,
          type: editingVacation.type,
          start_date: editingVacation.start_date,
          end_date: editingVacation.end_date,
          observations: editingVacation.observations || ''
        });
      } else {
        setFormData({
          employee_id: '',
          type: 'vacaciones',
          start_date: '',
          end_date: '',
          observations: ''
        });
      }
    }
  }, [editingVacation, isOpen]);

  // Calculate days between dates
  const calculatedDays = formData.start_date && formData.end_date 
    ? (() => {
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      })()
    : 0;

  return {
    formData,
    setFormData,
    calculatedDays
  };
};
