
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVacationEmployees = (isOpen: boolean) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vacation-form-employees', user?.id],
    queryFn: async () => {
      console.log('🔍 Fetching employees for vacation form...');
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cedula')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw error;
      }

      console.log('✅ Employees fetched for form:', data?.length || 0);
      
      // Filter duplicates by ID as safety measure
      const uniqueEmployees = data?.filter((employee, index, array) => 
        array.findIndex(e => e.id === employee.id) === index
      ) || [];

      return uniqueEmployees;
    },
    enabled: isOpen && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};
