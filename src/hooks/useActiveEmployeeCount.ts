
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para obtener el conteo de empleados activos de forma segura por company_id
 * - Usa perfil del usuario para filtrar por company_id
 * - Evita traer filas completas (usa count exact y head: true)
 */
export const useActiveEmployeeCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        if (!user) {
          throw new Error('🔒 [SECURITY] Usuario no autenticado');
        }

        // Obtener company_id del perfil del usuario de forma segura
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile?.company_id) {
          if (isMounted) setCount(0);
          return;
        }

        // Contar empleados activos sin traer filas
        const { count: activeCount, error: countError } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('estado', 'activo');

        if (countError) throw countError;
        if (isMounted) setCount(activeCount ?? 0);
      } catch (e: any) {
        if (isMounted) setError(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return { count, isLoading, error };
};
