
import { useState, useEffect, useCallback, useRef } from 'react';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';
import { calculateDaysBetween } from '@/utils/dateUtils';
import { usePeriodDetection, PeriodDetectionResult } from './usePeriodDetection';
import { supabase } from '@/integrations/supabase/client';
import { getVacationBreakdown, VacationBreakdown } from '@/utils/businessDayCalculator';

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
  const [periodInfo, setPeriodInfo] = useState<PeriodDetectionResult | null>(null);

  // Vacation business days state
  const [diasHabiles, setDiasHabiles] = useState<number>(0);
  const [employeeRestDays, setEmployeeRestDays] = useState<string[]>(['sabado', 'domingo']);
  const [vacationBreakdown, setVacationBreakdown] = useState<VacationBreakdown | null>(null);
  const [isLoadingRestDays, setIsLoadingRestDays] = useState(false);

  const { detectPeriodForDates, isDetecting } = usePeriodDetection();

  // Query employee's dias_descanso when employee_id changes
  useEffect(() => {
    const fetchRestDays = async () => {
      if (!formData.employee_id) {
        setEmployeeRestDays(['sabado', 'domingo']);
        return;
      }

      setIsLoadingRestDays(true);
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('dias_descanso')
          .eq('id', formData.employee_id)
          .single();

        if (error) {
          console.error('Error fetching employee rest days:', error);
          setEmployeeRestDays(['sabado', 'domingo']);
        } else {
          const newDays = data?.dias_descanso || ['sabado', 'domingo'];
          // Avoid unnecessary re-renders if rest days haven't changed
          setEmployeeRestDays(prev =>
            JSON.stringify(prev) === JSON.stringify(newDays) ? prev : newDays
          );
        }
      } catch (err) {
        console.error('Error fetching rest days:', err);
        setEmployeeRestDays(['sabado', 'domingo']);
      } finally {
        setIsLoadingRestDays(false);
      }
    };

    fetchRestDays();
  }, [formData.employee_id]);

  // Auto-calculate end_date when type is vacaciones and diasHabiles + start_date change
  useEffect(() => {
    if (formData.type === 'vacaciones' && formData.start_date && diasHabiles > 0) {
      const breakdown = getVacationBreakdown(formData.start_date, diasHabiles, employeeRestDays);
      setVacationBreakdown(breakdown);
      setFormData(prev => ({ ...prev, end_date: breakdown.endDate }));
    } else if (formData.type === 'vacaciones' && (!formData.start_date || diasHabiles <= 0)) {
      setVacationBreakdown(null);
    }
  }, [formData.type, formData.start_date, diasHabiles, employeeRestDays]);

  // Load editing data or pre-selected employee
  useEffect(() => {
    if (editingAbsence) {
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
      // When editing vacaciones, reverse-calculate business days
      if (editingAbsence.type === 'vacaciones' && editingAbsence.start_date && editingAbsence.end_date) {
        setDiasHabiles(editingAbsence.days_count || 0);
      }
    } else {
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
      setDiasHabiles(0);
      setVacationBreakdown(null);
      setPeriodInfo(null);
    }
  }, [editingAbsence, isOpen, preselectedEmployeeId]);

  // Automatic period detection for both create and edit
  useEffect(() => {
    const detectPeriod = async () => {
      if (formData.start_date && formData.end_date) {
        const detection = await detectPeriodForDates(formData.start_date, formData.end_date);
        setPeriodInfo(detection);
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
    } else {
      setCalculatedDays(0);
    }
  }, [formData.start_date, formData.end_date]);

  return {
    formData,
    setFormData,
    calculatedDays,
    periodInfo,
    isDetectingPeriod: isDetecting,
    // Vacation business days
    diasHabiles,
    setDiasHabiles,
    employeeRestDays,
    vacationBreakdown,
    isLoadingRestDays,
  };
};
