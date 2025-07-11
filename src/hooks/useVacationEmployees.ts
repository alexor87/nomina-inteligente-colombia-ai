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
      
      // Double security: Filter any remaining duplicates by cedula as safety measure
      // This should not be needed after the SQL cleanup, but provides extra protection
      const uniqueEmployees = data?.filter((employee, index, array) => {
        // Keep only the first occurrence of each cedula
        const firstIndex = array.findIndex(e => e.cedula === employee.cedula);
        return firstIndex === index;
      }) || [];

      // Log if any duplicates were filtered out (should be 0 after cleanup)
      if (data && uniqueEmployees.length !== data.length) {
        console.warn('⚠️ Filtered out duplicate employees:', data.length - uniqueEmployees.length);
      }

      return uniqueEmployees;
    },
    enabled: isOpen && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};
