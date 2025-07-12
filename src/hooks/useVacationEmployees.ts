
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVacationEmployees = (enabled: boolean = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vacation-employees'],
    queryFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cedula')
        .eq('estado', 'activo')
        .order('nombre');

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!user,
    // Forzar refresco de datos para mostrar la lista limpia
    staleTime: 0,
    cacheTime: 0,
  });
};
