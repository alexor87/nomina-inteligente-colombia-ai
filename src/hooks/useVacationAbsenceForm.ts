
import { useState, useEffect } from 'react';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';

export const useVacationAbsenceForm = (
  editingVacation?: VacationAbsence | null,
  isOpen?: boolean
) => {
  const [formData, setFormData] = useState<VacationAbsenceFormData>({
    employee_id: '',
    type: 'vacaciones', // ✅ AGREGADO: Valor por defecto
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
        type: editingVacation.type || 'vacaciones', // ✅ AGREGADO: Cargar tipo
        start_date: editingVacation.start_date,
        end_date: editingVacation.end_date,
        observations: editingVacation.observations || ''
      });
    } else {
      setFormData({
        employee_id: '',
        type: 'vacaciones', // ✅ AGREGADO: Valor por defecto
        start_date: '',
        end_date: '',
        observations: ''
      });
    }
  }, [editingVacation, isOpen]);

  // Calculate days automatically
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCalculatedDays(diffDays);
      } else {
        setCalculatedDays(0);
      }
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
