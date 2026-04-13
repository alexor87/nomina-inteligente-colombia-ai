
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VacationAbsence, VacationAbsenceFilters, VacationAbsenceFormData, VacationAbsenceStatus, VacationAbsenceType } from '@/types/vacations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { calculateDaysBetween } from '@/utils/dateUtils';
import { usePeriodDetection } from './usePeriodDetection';
import { getUserFriendlyError } from '@/utils/errorMessages';

export const useAbsences = (filters: VacationAbsenceFilters = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { detectPeriodForDates } = usePeriodDetection();

  console.log('useAbsences initialized', { filters, userId: user?.id });

  // Helper function to check if a novedad_type is a valid absence type
  const isValidAbsenceType = (type: string): type is VacationAbsenceType => {
    const validTypes: VacationAbsenceType[] = [
      'vacaciones',
      'licencia_remunerada',
      'licencia_no_remunerada',
      'incapacidad',
      'ausencia'
    ];
    return validTypes.includes(type as VacationAbsenceType);
  };

  // Fetch absences
  const fetchAbsences = async (): Promise<VacationAbsence[]> => {
    if (!user) {
      console.log('No user authenticated');
      throw new Error('Usuario no autenticado');
    }

    console.log('Fetching absences with filters:', filters);

    let query = supabase
      .from('employee_absences')
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

    // Apply filters - only if they have valid values
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
      query = query.or(`
        employee.nombre.ilike.%${filters.employee_search}%,
        employee.apellido.ilike.%${filters.employee_search}%,
        employee.cedula.ilike.%${filters.employee_search}%
      `);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching absences:', error);
      throw error;
    }

    console.log('Fetched absences:', data?.length || 0);

    // Filter and transform the data to ensure only valid absence types
    return (data || [])
      .filter(item => isValidAbsenceType(item.type))
      .map(item => ({
        ...item,
        status: item.status as VacationAbsenceStatus,
        type: item.type as VacationAbsenceType
      }));
  };

  // Query to fetch data
  const {
    data: absences = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['absences', filters],
    queryFn: fetchAbsences,
    enabled: !!user,
  });

  // Validate overlaps
  const validateOverlap = async (
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeId?: string
  ): Promise<boolean> => {
    let query = supabase
      .from('employee_absences')
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

  // Create mutation with automatic period detection
  const createMutation = useMutation({
    mutationFn: async (formData: VacationAbsenceFormData) => {
      if (!user) throw new Error('Usuario no autenticado');

      const companyId = await getCompanyId();

      const days = calculateDaysBetween(formData.start_date, formData.end_date);

      const hasOverlap = await validateOverlap(
        formData.employee_id,
        formData.start_date,
        formData.end_date
      );

      if (hasOverlap) {
        throw new Error('El empleado ya tiene una ausencia registrada en este periodo');
      }

      const periodDetection = await detectPeriodForDates(formData.start_date, formData.end_date);

      if (!periodDetection.periodId) {
        throw new Error('No se pudo determinar un periodo valido para las fechas seleccionadas');
      }

      console.log('Using detected period:', periodDetection);

      const { data, error } = await supabase
        .from('employee_absences')
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
          processed_in_period_id: periodDetection.periodId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Ausencia registrada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating absence:', error);
      toast.error(getUserFriendlyError(error));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: VacationAbsenceFormData }) => {
      if (!user) throw new Error('Usuario no autenticado');

      const days = calculateDaysBetween(formData.start_date, formData.end_date);

      const hasOverlap = await validateOverlap(
        formData.employee_id,
        formData.start_date,
        formData.end_date,
        id
      );

      if (hasOverlap) {
        throw new Error('El empleado ya tiene una ausencia registrada en este periodo');
      }

      const periodDetection = await detectPeriodForDates(formData.start_date, formData.end_date);

      console.log('Period detection for update:', periodDetection);

      const { data, error } = await supabase
        .from('employee_absences')
        .update({
          employee_id: formData.employee_id,
          type: formData.type,
          subtipo: formData.subtipo,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: days,
          observations: formData.observations,
          processed_in_period_id: periodDetection.periodId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Ausencia actualizada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating absence:', error);
      toast.error(getUserFriendlyError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_absences')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Ausencia eliminada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting absence:', error);
      toast.error('Error al eliminar la ausencia');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VacationAbsenceStatus }) => {
      const { data, error } = await supabase
        .from('employee_absences')
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
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Estado actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    },
  });

  return {
    absences,
    isLoading,
    error,
    refetch,
    createAbsence: createMutation.mutateAsync,
    updateAbsence: updateMutation.mutateAsync,
    deleteAbsence: deleteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    calculateDays: calculateDaysBetween,
  };
};
