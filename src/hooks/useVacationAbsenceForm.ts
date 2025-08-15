
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

export const useVacationAbsenceForm = (
  editingVacation?: VacationAbsence | null,
  isOpen?: boolean,
  preselectedEmployeeId?: string
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

  // ✅ MODIFICADO: Load editing data o empleado pre-seleccionado CON DEBUGGING
  useEffect(() => {
    console.log('🎯 DEBUG useVacationAbsenceForm - Inicializando con:', {
      editingVacation: !!editingVacation,
      preselectedEmployeeId,
      isOpen
    });

    if (editingVacation) {
      console.log('✅ Cargando datos de edición:', editingVacation);
      setFormData({
        employee_id: editingVacation.employee_id,
        type: editingVacation.type || 'vacaciones',
        subtipo: editingVacation.subtipo,
        start_date: editingVacation.start_date,
        end_date: editingVacation.end_date,
        observations: editingVacation.observations || ''
      });
    } else {
      console.log('✅ Inicializando nueva ausencia con empleado:', preselectedEmployeeId || 'ninguno');
      setFormData({
        employee_id: preselectedEmployeeId || '',
        type: 'vacaciones',
        subtipo: undefined,
        start_date: '',
        end_date: '',
        observations: ''
      });
      setPeriodInfo(null);
    }
  }, [editingVacation, isOpen, preselectedEmployeeId]);

  // 🎯 CORRECCIÓN: Detección automática TANTO para crear como para editar
  useEffect(() => {
    const detectPeriod = async () => {
      if (formData.start_date && formData.end_date) {
        console.log('🔍 Detectando período(s) para fechas:', { 
          start: formData.start_date, 
          end: formData.end_date,
          isEditing: !!editingVacation
        });
        
        const detection = await detectPeriodForDates(formData.start_date, formData.end_date);
        setPeriodInfo(detection);
        
        if (detection.crossesMultiplePeriods) {
          console.log('⚡ MULTI-PERÍODO detectado:', {
            segments: detection.periodSegments?.length,
            primaryPeriod: detection.periodName
          });
        } else {
          console.log('✅ Período detectado:', detection);
        }
      } else {
        setPeriodInfo(null);
      }
    };

    // 🎯 CORRECCIÓN: Eliminar condición !editingVacation - detectar período SIEMPRE
    if (formData.start_date && formData.end_date) {
      detectPeriod();
    }
  }, [formData.start_date, formData.end_date, detectPeriodForDates]);

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
