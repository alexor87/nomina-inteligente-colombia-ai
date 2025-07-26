import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Secure query hook that automatically filters by company_id
 * Prevents cross-company data access
 */
export const useSecureQuery = <T = any>(
  queryKey: (string | number | boolean)[],
  tableName: string,
  select: string = '*',
  additionalFilters?: Record<string, any>,
  options?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['secure', ...queryKey],
    queryFn: async () => {
      if (!user) {
        throw new Error('🔒 [SECURITY] User not authenticated');
      }

      // Get user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('🔒 [SECURITY] No company found for user');
      }

      // Build secure query with automatic company_id filter
      let query = (supabase as any)
        .from(tableName)
        .select(select)
        .eq('company_id', profile.company_id);

      // Add additional filters
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`🔒 [SECURITY] Query error for table ${tableName}:`, error);
        throw error;
      }

      console.log(`🔒 [SECURITY] Secure query to ${tableName} returned ${data?.length || 0} rows for company ${profile.company_id}`);
      return data || [];
    },
    enabled: !!user,
    ...options,
  });
};

/**
 * Hook specifically for employees with built-in security
 */
export const useSecureEmployees = (filters?: Record<string, any>) => {
  return useSecureQuery(
    ['employees', JSON.stringify(filters || {})],
    'employees',
    'id, nombre, apellido, cedula, cargo, estado, salario_base, fecha_ingreso',
    filters
  );
};

/**
 * Hook specifically for active employees for vacation management
 */
export const useSecureVacationEmployees = (enabled = true) => {
  return useSecureQuery(
    ['vacation-employees'],
    'employees',
    'id, nombre, apellido, cedula',
    { estado: 'activo' },
    { 
      enabled,
      staleTime: 0,
      gcTime: 0 
    }
  );
};