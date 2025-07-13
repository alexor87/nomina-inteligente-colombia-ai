
import { useState, useEffect } from 'react';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';
import { calculateDaysBetween } from '@/utils/dateUtils';

export const useVacationAbsenceForm = (
  editingVacation?: VacationAbsence | null,
  isOpen?: boolean
) => {
  const [formData, setFormData] = useState<VacationAbsenceFormData>({
    employee_id: '',
    type: 'vacaciones',
    start_date: '',
    end_date: '',
    observations: ''
  });
  const [calculatedDays, setCalculatedDays] = useState<number>(0);

  // Load editing data
  useEffect(() => {
    if (editingVacation) {
      setFormData({
        employee_id: editingVacation.employee_id,
        type: editingVacation.type || 'vacaciones',
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
  }, [editingVacation, isOpen]);

  // Calculate days automatically using the centralized utility
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const days = calculateDaysBetween(formData.start_date, formData.end_date);
      setCalculatedDays(days);
      console.log('📅 Hook - Calculated days:', { 
        start: formData.start_date, 
        end: formData.end_date, 
        days 
      });
    } else {
      setCalculatedDays(0);
    }
  }, [formData.start_date, formData.end_date]);

  return {
    formData,
    setFormData,
    calculatedDays
  };
};
