
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';

interface UserRole {
  role: AppRole;
  company_id?: string;
}

export const useRoleManagement = (user: User | null, profile: any) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const retryAttempts = useRef(0);
  const maxRetries = 3;

  const fetchUserRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setIsLoadingRoles(false);
      return;
    }

    console.log('🔍 [ROLES] Fetching roles for user:', user.email);
    
    try {
      // Try RPC first
      const { data: rpcRoles, error: rpcError } = await supabase
        .rpc('get_user_companies_simple', { _user_id: user.id });
      
      if (!rpcError && rpcRoles && rpcRoles.length > 0) {
        const transformedRoles: UserRole[] = rpcRoles.map((role: any) => ({
          role: role.role_name as AppRole,
          company_id: role.company_id
        }));
        setRoles(transformedRoles);
        setIsLoadingRoles(false);
        retryAttempts.current = 0;
        console.log('✅ [ROLES] Successfully loaded via RPC:', transformedRoles);
        return;
      }

      // Fallback to direct query
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
        setRoles(fallbackRoles);
        setIsLoadingRoles(false);
        retryAttempts.current = 0;
        console.log('✅ [ROLES] Successfully loaded via direct query:', fallbackRoles);
        return;
      }

      // If no roles found and user has company_id, try auto-assignment
      if (profile?.company_id && retryAttempts.current < maxRetries) {
        console.log('🔄 [ROLES] No roles found, attempting auto-assignment...');
        
        const { error: assignError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'administrador',
            company_id: profile.company_id,
            assigned_by: user.id
          })
          .select()
          .single();

        if (!assignError) {
          console.log('✅ [ROLES] Auto-assigned admin role');
          retryAttempts.current++;
          // Retry fetching after assignment
          setTimeout(() => fetchUserRoles(), 500);
          return;
        }
      }

      // No roles found after all attempts
      console.log('⚠️ [ROLES] No roles found after all attempts');
      setRoles([]);
      setIsLoadingRoles(false);

    } catch (error) {
      console.error('❌ [ROLES] Error fetching roles:', error);
      setRoles([]);
      setIsLoadingRoles(false);
    }
  }, [user, profile?.company_id]);

  // Set up real-time subscription to user_roles
  useEffect(() => {
    if (!user) return;

    console.log('🔔 [ROLES] Setting up real-time subscription for user:', user.email);

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
          fetchUserRoles();
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [ROLES] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserRoles]);

  // Initial fetch when user or profile changes
  useEffect(() => {
    if (user) {
      setIsLoadingRoles(true);
      retryAttempts.current = 0;
      fetchUserRoles();
    }
  }, [user, profile?.company_id, fetchUserRoles]);

  return {
    roles,
    isLoadingRoles,
    refetchRoles: fetchUserRoles
  };
};
