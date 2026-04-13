
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte' | 'superadmin';

interface UserRole {
  role: AppRole;
  company_id?: string;
}

export const useRoleManagement = (user: User | null, profile: any) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [hasOptimisticRole, setHasOptimisticRole] = useState(false);
  const [roleLoadFailed, setRoleLoadFailed] = useState(false);
  const fetchAttempts = useRef(0);
  const maxAttempts = 3;
  const fetchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Crear rol optimista de administrador si el usuario tiene empresa pero no roles aún
  const createOptimisticRole = useCallback(() => {
    if (user && profile?.company_id && roles.length === 0 && !hasOptimisticRole) {
      console.log('🎯 [ROLES] Creating optimistic visualizador role while loading');
      const optimisticRole: UserRole = {
        role: 'visualizador',
        company_id: profile.company_id
      };
      setRoles([optimisticRole]);
      setHasOptimisticRole(true);
      setIsLoadingRoles(false);
      return true;
    }
    return false;
  }, [user, profile?.company_id, roles.length, hasOptimisticRole]);

  const fetchUserRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setIsLoadingRoles(false);
      setHasOptimisticRole(false);
      return;
    }

    console.log(`🔍 [ROLES] Fetching roles for user (attempt ${fetchAttempts.current + 1}):`, user.id?.slice(0, 8));
    
    try {
      // Intentar RPC primero
      const { data: rpcRoles, error: rpcError } = await supabase
        .rpc('get_user_companies_simple', { _user_id: user.id });
      
      if (!rpcError && rpcRoles && rpcRoles.length > 0) {
        const transformedRoles: UserRole[] = rpcRoles.map((role: any) => ({
          role: role.role_name as AppRole,
          company_id: role.company_id
        }));
        
        console.log('✅ [ROLES] Successfully loaded via RPC:', transformedRoles);
        setRoles(transformedRoles);
        setIsLoadingRoles(false);
        setHasOptimisticRole(false);
        setRoleLoadFailed(false);
        fetchAttempts.current = 0;
        return;
      }

      // Fallback a consulta directa
      console.log('⚠️ [ROLES] RPC failed, trying direct query...');
      const { data: directRoles, error: directError } = await supabase
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', user.id);
      
      if (!directError && directRoles && directRoles.length > 0) {
        const fallbackRoles: UserRole[] = directRoles.map((role: any) => ({
          role: role.role as AppRole,
          company_id: role.company_id
        }));
        
        console.log('✅ [ROLES] Successfully loaded via direct query:', fallbackRoles);
        setRoles(fallbackRoles);
        setIsLoadingRoles(false);
        setHasOptimisticRole(false);
        setRoleLoadFailed(false);
        fetchAttempts.current = 0;
        return;
      }

      // Si no hay roles y el usuario tiene empresa, crear rol optimista mientras esperamos
      if (profile?.company_id) {
        const createdOptimistic = createOptimisticRole();
        
        // Reintentar después de un delay solo si no hemos alcanzado el máximo
        if (fetchAttempts.current < maxAttempts && !createdOptimistic) {
          fetchAttempts.current++;
          const delay = [100, 300, 700][fetchAttempts.current - 1] || 1000;
          
          console.log(`🔄 [ROLES] No roles found, retrying in ${delay}ms (attempt ${fetchAttempts.current}/${maxAttempts})`);
          
          fetchTimeout.current = setTimeout(() => {
            fetchUserRoles();
          }, delay);
          return;
        }

        // Máximo de intentos alcanzado: mantener rol visualizador ya asignado
        if (fetchAttempts.current >= maxAttempts && profile?.company_id) {
          console.log('⚠️ [ROLES] Max attempts reached, keeping visualizador role until real roles load');
          createOptimisticRole();
          return;
        }
      }

      // No hay empresa o no se pudo crear rol optimista
      console.log('⚠️ [ROLES] No roles found and no company assigned');
      setRoles([]);
      setIsLoadingRoles(false);
      setHasOptimisticRole(false);

    } catch (error) {
      console.error('❌ [ROLES] Error fetching roles:', error);

      // En caso de error, NO otorgar acceso — marcar como fallo
      setRoles([]);
      setIsLoadingRoles(false);
      setHasOptimisticRole(false);
      setRoleLoadFailed(true);
    }
  }, [user, profile?.company_id, createOptimisticRole]);

  // Timeout de seguridad para evitar carga infinita
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (isLoadingRoles && user) {
        console.log('⏰ [ROLES] Safety timeout reached — denying access');
        setIsLoadingRoles(false);
        setRoleLoadFailed(true);
      }
    }, 10000); // 10 segundos máximo

    return () => clearTimeout(safetyTimeout);
  }, [isLoadingRoles, user]);

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (!user) return;

    console.log('🔔 [ROLES] Setting up real-time subscription for user:', user.id?.slice(0, 8));

    const channel = supabase
      .channel('user-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 [ROLES] Real-time update received:', payload);
          
          // Si recibimos una actualización en tiempo real, resetear attempts y refetch
          fetchAttempts.current = 0;
          setHasOptimisticRole(false); // Limpiar optimistic role cuando llegan datos reales
          
          // Delay pequeño para permitir que la transacción se complete
          setTimeout(() => {
            fetchUserRoles();
          }, 200);
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [ROLES] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserRoles]);

  // Fetch inicial cuando cambia el usuario o profile
  useEffect(() => {
    if (user) {
      setIsLoadingRoles(true);
      fetchAttempts.current = 0;
      setHasOptimisticRole(false);
      
      // Limpiar timeout anterior si existe
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
      
      fetchUserRoles();
    }

    return () => {
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
    };
  }, [user, profile?.company_id, fetchUserRoles]);

  return {
    roles,
    isLoadingRoles,
    hasOptimisticRole,
    roleLoadFailed,
    refetchRoles: fetchUserRoles
  };
};
