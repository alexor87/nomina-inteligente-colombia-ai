
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VacationAbsence, VacationAbsenceFilters, VacationAbsenceFormData, VacationAbsenceStatus } from '@/types/vacations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useVacationsAbsences = (filters: VacationAbsenceFilters = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Función para obtener las vacaciones y ausencias
  const fetchVacationsAbsences = async (): Promise<VacationAbsence[]> => {
    if (!user) throw new Error('Usuario no autenticado');

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

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
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
      console.error('Error fetching vacations absences:', error);
      throw error;
    }

    // Transformar los datos para asegurar que el status sea del tipo correcto
    return (data || []).map(item => ({
      ...item,
      status: item.status as VacationAbsenceStatus
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

  // Función para calcular días entre fechas
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
    return diffDays;
  };

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

  // Obtener company_id del usuario
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

  // Mutación para crear vacación/ausencia
  const createMutation = useMutation({
    mutationFn: async (formData: VacationAbsenceFormData) => {
      if (!user) throw new Error('Usuario no autenticado');

      const companyId = await getCompanyId();

      // Calcular días
      const days = calculateDays(formData.start_date, formData.end_date);

      // Validar solapamiento
      const hasOverlap = await validateOverlap(
        formData.employee_id,
        formData.start_date,
        formData.end_date
      );

      if (hasOverlap) {
        throw new Error('El empleado ya tiene una ausencia registrada en este período');
      }

      const { data, error } = await supabase
        .from('employee_vacation_periods')
        .insert({
          company_id: companyId,
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: days,
          observations: formData.observations,
          status: 'pendiente',
          created_by: user.id,
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

      const days = calculateDays(formData.start_date, formData.end_date);

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

      const { data, error } = await supabase
        .from('employee_vacation_periods')
        .update({
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: days,
          observations: formData.observations,
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

  // Mutación para eliminar
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

  // Mutación para cambiar estado
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
    calculateDays,
  };
};
