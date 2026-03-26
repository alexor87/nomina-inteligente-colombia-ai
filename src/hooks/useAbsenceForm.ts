
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
  crossesMultiplePeriods?: boolean;
  periodSegments?: any[];
}

export const useAbsenceForm = (
  editingAbsence?: VacationAbsence | null,
  isOpen?: boolean,
  preselectedEmployeeId?: string
) => {
  const [formData, setFormData] = useState<VacationAbsenceFormData>({
    employee_id: '',
    type: 'vacaciones',
    subtipo: undefined,
    start_date: '',
    end_date: '',
    observations: '',
    payer_type: undefined,
    medical_certificate_url: undefined,
    diagnosis: undefined,
  });
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);

  const { detectPeriodForDates, isDetecting } = usePeriodDetection();

  // Load editing data or pre-selected employee
  useEffect(() => {
    console.log('useAbsenceForm - Initializing with:', {
      editingAbsence: !!editingAbsence,
      preselectedEmployeeId,
      isOpen
    });

    if (editingAbsence) {
      console.log('Loading edit data:', editingAbsence);
      setFormData({
        employee_id: editingAbsence.employee_id,
        type: editingAbsence.type || 'vacaciones',
        subtipo: editingAbsence.subtipo,
        start_date: editingAbsence.start_date,
        end_date: editingAbsence.end_date,
        observations: editingAbsence.observations || '',
        payer_type: (editingAbsence as any).payer_type || undefined,
        medical_certificate_url: (editingAbsence as any).medical_certificate_url || undefined,
        diagnosis: (editingAbsence as any).diagnosis || undefined,
      });
    } else {
      console.log('Initializing new absence with employee:', preselectedEmployeeId || 'none');
      setFormData({
        employee_id: preselectedEmployeeId || '',
        type: 'vacaciones',
        subtipo: undefined,
        start_date: '',
        end_date: '',
        observations: '',
        payer_type: undefined,
        medical_certificate_url: undefined,
        diagnosis: undefined,
      });
      setPeriodInfo(null);
    }
  }, [editingAbsence, isOpen, preselectedEmployeeId]);

  // Automatic period detection for both create and edit
  useEffect(() => {
    const detectPeriod = async () => {
      if (formData.start_date && formData.end_date) {
        console.log('Detecting period(s) for dates:', {
          start: formData.start_date,
          end: formData.end_date,
          isEditing: !!editingAbsence
        });

        const detection = await detectPeriodForDates(formData.start_date, formData.end_date);
        setPeriodInfo(detection);

        if (detection.crossesMultiplePeriods) {
          console.log('MULTI-PERIOD detected:', {
            segments: detection.periodSegments?.length,
            primaryPeriod: detection.periodName
          });
        } else {
          console.log('Period detected:', detection);
        }
      } else {
        setPeriodInfo(null);
      }
    };

    if (formData.start_date && formData.end_date) {
      detectPeriod();
    }
  }, [formData.start_date, formData.end_date, detectPeriodForDates]);

  // Calculate days automatically using the centralized utility
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const days = calculateDaysBetween(formData.start_date, formData.end_date);
      setCalculatedDays(days);
      console.log('Calculated days:', {
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
