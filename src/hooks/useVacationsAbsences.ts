
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VacationAbsence, VacationAbsenceFilters, VacationAbsenceFormData, VacationAbsenceStatus, VacationAbsenceType } from '@/types/vacations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { calculateDaysBetween } from '@/utils/dateUtils';
import { usePeriodDetection } from './usePeriodDetection';

export const useVacationsAbsences = (filters: VacationAbsenceFilters = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { detectPeriodForDates } = usePeriodDetection();

  console.log('🪝 useVacationsAbsences initialized', { filters, userId: user?.id });

  // Helper function to check if a novedad_type is a valid vacation/absence type
  const isValidVacationAbsenceType = (type: string): type is VacationAbsenceType => {
    const validTypes: VacationAbsenceType[] = [
      'vacaciones',
      'licencia_remunerada', 
      'licencia_no_remunerada',
      'incapacidad',
      'ausencia'
    ];
    return validTypes.includes(type as VacationAbsenceType);
  };

  // Función para obtener las vacaciones y ausencias
  const fetchVacationsAbsences = async (): Promise<VacationAbsence[]> => {
    if (!user) {
      console.log('❌ No user authenticated');
      throw new Error('Usuario no autenticado');
    }

    console.log('🔍 Fetching vacations absences with filters:', filters);

    let query = supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employee:employees!inner(
          id,
          nombre,
          apellido,
          cedula
        )
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros - solo si tienen valores válidos (no undefined y no son valores especiales)
    if (filters.status && filters.status !== 'ALL_STATUSES' as any) {
      query = query.eq('status', filters.status);
    }

    if (filters.type && filters.type !== 'ALL_TYPES' as any) {
      query = query.eq('type', filters.type);
    }

    if (filters.date_from) {
      query = query.gte('start_date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('end_date', filters.date_to);
    }

    if (filters.employee_search) {
      // Buscar por nombre, apellido o cédula
      query = query.or(`
        employee.nombre.ilike.%${filters.employee_search}%,
        employee.apellido.ilike.%${filters.employee_search}%,
        employee.cedula.ilike.%${filters.employee_search}%
      `);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching vacations absences:', error);
      throw error;
    }

    console.log('✅ Fetched vacations absences:', data?.length || 0);

    // Filter and transform the data to ensure only valid vacation/absence types
    return (data || [])
      .filter(item => isValidVacationAbsenceType(item.type))
      .map(item => ({
        ...item,
        status: item.status as VacationAbsenceStatus,
        type: item.type as VacationAbsenceType
      }));
  };

  // Query para obtener datos
  const {
    data: vacationsAbsences = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['vacations-absences', filters],
    queryFn: fetchVacationsAbsences,
    enabled: !!user,
  });

  // Función para validar solapamientos
  const validateOverlap = async (
    employeeId: string, 
    startDate: string, 
    endDate: string,
    excludeId?: string
  ): Promise<boolean> => {
    let query = supabase
      .from('employee_vacation_periods')
      .select('id, start_date, end_date')
      .eq('employee_id', employeeId)
      .neq('status', 'cancelada')
      .or(`
        and(start_date.lte.${endDate},end_date.gte.${startDate})
      `);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return (data && data.length > 0) || false;
  };

  const getCompanyId = async (): Promise<string> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user?.id)
      .single();
    
    if (!profile?.company_id) {
      throw new Error('Usuario no tiene empresa asignada');
    }
    
    return profile.company_id;
  };

  // 🎯 MUTACIÓN MEJORADA: Usar detección automática de período
  const createMutation = useMutation({
    mutationFn: async (formData: VacationAbsenceFormData) => {
      if (!user) throw new Error('Usuario no autenticado');

      const companyId = await getCompanyId();

      // Use the centralized date calculation utility
      const days = calculateDaysBetween(formData.start_date, formData.end_date);

      // Validar solapamiento
      const hasOverlap = await validateOverlap(
        formData.employee_id,
        formData.start_date,
        formData.end_date
      );

      if (hasOverlap) {
        throw new Error('El empleado ya tiene una ausencia registrada en este período');
      }

      // 🎯 DETECCIÓN AUTOMÁTICA: El período ya fue detectado/creado automáticamente
      const periodDetection = await detectPeriodForDates(formData.start_date, formData.end_date);
      
      if (!periodDetection.periodId) {
        throw new Error('No se pudo determinar un período válido para las fechas seleccionadas');
      }

      console.log('🎯 Usando período detectado:', periodDetection);

      const { data, error } = await supabase
        .from('employee_vacation_periods')
        .insert({
          company_id: companyId,
          employee_id: formData.employee_id,
          type: formData.type,
          subtipo: formData.subtipo,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: days,
          observations: formData.observations,
          status: 'pendiente',
          created_by: user.id,
          processed_in_period_id: periodDetection.periodId, // 🎯 Período garantizado
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations-absences'] });
      toast.success('Ausencia registrada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating vacation/absence:', error);
      toast.error(error.message || 'Error al registrar la ausencia');
    },
  });

  // Mutación para actualizar
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: VacationAbsenceFormData }) => {
      if (!user) throw new Error('Usuario no autenticado');

      // Use the centralized date calculation utility
      const days = calculateDaysBetween(formData.start_date, formData.end_date);

      // Validar solapamiento excluyendo el registro actual
      const hasOverlap = await validateOverlap(
        formData.employee_id,
        formData.start_date,
        formData.end_date,
        id
      );

      if (hasOverlap) {
        throw new Error('El empleado ya tiene una ausencia registrada en este período');
      }

      // Para actualizaciones, detectar período también
      const periodDetection = await detectPeriodForDates(formData.start_date, formData.end_date);
      
      console.log('🎯 Detección de período para actualización:', periodDetection);

      const { data, error } = await supabase
        .from('employee_vacation_periods')
        .update({
          employee_id: formData.employee_id,
          type: formData.type,
          subtipo: formData.subtipo,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: days,
          observations: formData.observations,
          processed_in_period_id: periodDetection.periodId, // 🎯 Período actualizado
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations-absences'] });
      toast.success('Ausencia actualizada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating vacation/absence:', error);
      toast.error(error.message || 'Error al actualizar la ausencia');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_vacation_periods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations-absences'] });
      toast.success('Ausencia eliminada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting vacation/absence:', error);
      toast.error('Error al eliminar la ausencia');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VacationAbsenceStatus }) => {
      const { data, error } = await supabase
        .from('employee_vacation_periods')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations-absences'] });
      toast.success('Estado actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    },
  });

  return {
    vacationsAbsences,
    isLoading,
    error,
    refetch,
    createVacationAbsence: createMutation.mutateAsync,
    updateVacationAbsence: updateMutation.mutateAsync,
    deleteVacationAbsence: deleteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    calculateDays: calculateDaysBetween,
  };
};
