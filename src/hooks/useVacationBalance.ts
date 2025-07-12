
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VacationBalance {
  id: string;
  employee_id: string;
  company_id: string;
  accumulated_days: number;
  initial_balance: number;
  last_calculated: string | null;
  created_at: string;
  updated_at: string;
}

export const useVacationBalance = (employeeId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vacationBalance, isLoading, error } = useQuery({
    queryKey: ['vacation-balance', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from('employee_vacation_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) throw error;
      return data as VacationBalance | null;
    },
    enabled: !!employeeId
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (balanceData: {
      employee_id: string;
      company_id: string;
      initial_balance: number;
      accumulated_days?: number;
    }) => {
      const { data, error } = await supabase
        .from('employee_vacation_balances')
        .upsert({
          employee_id: balanceData.employee_id,
          company_id: balanceData.company_id,
          initial_balance: balanceData.initial_balance,
          accumulated_days: balanceData.accumulated_days || balanceData.initial_balance,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-balance', employeeId] });
      toast({
        title: "Balance actualizado",
        description: "El balance de vacaciones se ha actualizado correctamente",
      });
    },
    onError: (error) => {
      console.error('Error updating vacation balance:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el balance de vacaciones",
        variant: "destructive"
      });
    }
  });

  return {
    vacationBalance,
    isLoading,
    error,
    createOrUpdate: createOrUpdateMutation.mutate,
    isUpdating: createOrUpdateMutation.isPending
  };
};
