
import { useState, useEffect } from 'react';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';
import { calculateDaysBetween } from '@/utils/dateUtils';
import { usePeriodDetection } from './usePeriodDetection';

interface PeriodInfo {
  periodId: string | null;
  periodName: string | null;
  isExact: boolean;
  isAutoCreated: boolean;
  message: string;
}

export const useVacationAbsenceForm = (
  editingVacation?: VacationAbsence | null,
  isOpen?: boolean
) => {
  const [formData, setFormData] = useState<VacationAbsenceFormData>({
    employee_id: '',
    type: 'vacaciones',
    subtipo: undefined,
    start_date: '',
    end_date: '',
    observations: ''
  });
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);
  
  const { detectPeriodForDates, isDetecting } = usePeriodDetection();

  // Load editing data
  useEffect(() => {
    if (editingVacation) {
      setFormData({
        employee_id: editingVacation.employee_id,
        type: editingVacation.type || 'vacaciones',
        subtipo: editingVacation.subtipo,
        start_date: editingVacation.start_date,
        end_date: editingVacation.end_date,
        observations: editingVacation.observations || ''
      });
    } else {
      setFormData({
        employee_id: '',
        type: 'vacaciones',
        subtipo: undefined,
        start_date: '',
        end_date: '',
        observations: ''
      });
      setPeriodInfo(null);
    }
  }, [editingVacation, isOpen]);

  // 🎯 NUEVA FUNCIONALIDAD: Detección automática de período al cambiar fechas
  useEffect(() => {
    const detectPeriod = async () => {
      if (formData.start_date && formData.end_date) {
        console.log('🔍 Detectando período para fechas:', { 
          start: formData.start_date, 
          end: formData.end_date 
        });
        
        const detection = await detectPeriodForDates(formData.start_date, formData.end_date);
        setPeriodInfo(detection);
        
        console.log('✅ Período detectado:', detection);
      } else {
        setPeriodInfo(null);
      }
    };

    // Solo detectar si no estamos editando (para nuevas ausencias)
    if (!editingVacation && formData.start_date && formData.end_date) {
      detectPeriod();
    }
  }, [formData.start_date, formData.end_date, editingVacation, detectPeriodForDates]);

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
    calculatedDays,
    periodInfo,
    isDetectingPeriod: isDetecting
  };
};
