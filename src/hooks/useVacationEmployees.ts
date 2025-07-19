
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  cargo: string;
}

export const useVacationEmployees = (enabled: boolean = true) => {
  return useQuery<Employee[]>({
    queryKey: ['vacation-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cedula, cargo')
        .eq('estado', 'activo')
        .order('nombre');

      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};
