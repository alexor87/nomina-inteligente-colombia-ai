
import { useState, useEffect, useCallback } from 'react';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';
import { calculateDaysBetween } from '@/utils/dateUtils';
import { usePeriodDetection } from './usePeriodDetection';
import { supabase } from '@/integrations/supabase/client';
import { getVacationBreakdown, VacationBreakdown } from '@/utils/businessDayCalculator';

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
          setEmployeeRestDays(data?.dias_descanso || ['sabado', 'domingo']);
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

      // Update end_date in formData
      if (breakdown.endDate !== formData.end_date) {
        setFormData(prev => ({ ...prev, end_date: breakdown.endDate }));
      }

      console.log('Vacation breakdown calculated:', breakdown);
    } else if (formData.type === 'vacaciones' && (!formData.start_date || diasHabiles <= 0)) {
      setVacationBreakdown(null);
    }
  }, [formData.type, formData.start_date, diasHabiles, employeeRestDays]);

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
      // When editing vacaciones, reverse-calculate business days
      if (editingAbsence.type === 'vacaciones' && editingAbsence.start_date && editingAbsence.end_date) {
        // Will be recalculated once employeeRestDays loads
        setDiasHabiles(editingAbsence.days_count || 0);
      }
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
      setDiasHabiles(0);
      setVacationBreakdown(null);
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
    isDetectingPeriod: isDetecting,
    // Vacation business days
    diasHabiles,
    setDiasHabiles,
    employeeRestDays,
    vacationBreakdown,
    isLoadingRestDays,
  };
};
