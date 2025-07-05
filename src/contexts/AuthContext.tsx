
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { performCompleteRoleCheck } from '@/utils/roleUtils';

type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';

interface UserRole {
  role: AppRole;
  company_id?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  company_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: UserRole[];
  profile: UserProfile | null;
  isSuperAdmin: boolean;
  hasRole: (role: AppRole, companyId?: string) => boolean;
  hasModuleAccess: (module: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Matriz de permisos por rol - simplificada para mayor estabilidad
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  administrador: ['dashboard', 'employees', 'payroll', 'payroll-history', 'vouchers', 'payments', 'reports', 'settings'],
  rrhh: ['dashboard', 'employees', 'payroll-history', 'vouchers', 'reports'],
  contador: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
  visualizador: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
  soporte: ['dashboard', 'reports', 'employees']
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Refs to prevent redundant calls
  const isRefreshingUserData = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  const hasRole = useCallback((role: AppRole, companyId?: string): boolean => {
    try {
      if (roles.length === 0) {
        return false;
      }
      
      return roles.some(r => {
        const roleMatch = r.role === role;
        const companyMatch = companyId ? r.company_id === companyId : true;
        return roleMatch && companyMatch;
      });
    } catch (error) {
      console.error('Error in hasRole:', error);
      return false;
    }
  }, [roles]);

  const hasModuleAccess = useCallback((module: string): boolean => {
    try {
      // Si no hay roles cargados, permitir acceso básico para evitar pantalla vacía
      if (roles.length === 0 && user) {
        // Permitir acceso a módulos básicos mientras se cargan los roles
        const basicModules = ['dashboard', 'employees', 'payroll', 'payroll-history', 'reports', 'settings'];
        return basicModules.includes(module);
      }
      
      return roles.some(userRole => {
        const permissions = ROLE_PERMISSIONS[userRole.role];
        return permissions && permissions.includes(module);
      });
    } catch (error) {
      console.error('Error in hasModuleAccess:', error);
      // En caso de error, permitir acceso básico
      return ['dashboard', 'employees', 'payroll', 'payroll-history', 'reports', 'settings'].includes(module);
    }
  }, [roles, user]);

  const refreshUserData = useCallback(async () => {
    if (isRefreshingUserData.current) {
      return;
    }

    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      return;
    }

    isRefreshingUserData.current = true;

    try {
      // Fetch profile with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      try {
        const { data: profileData, error: profileError } = await Promise.race([
          profilePromise,
          profileTimeout
        ]) as any;

        if (!profileError && profileData) {
          setProfile(profileData);
          
          // Only run role check if user has a company
          if (profileData.company_id) {
            setTimeout(() => {
              performCompleteRoleCheck(currentUser.id).catch(console.error);
            }, 100);
          }
        } else {
          console.warn('Profile fetch failed:', profileError);
          setProfile(null);
        }
      } catch (error) {
        console.warn('Profile fetch timed out or failed:', error);
        setProfile(null);
      }

      // Fetch roles with timeout
      const rolesPromise = supabase
        .rpc('get_user_companies_simple', { _user_id: currentUser.id });

      const rolesTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Roles fetch timeout')), 5000)
      );

      try {
        const { data: userRoles, error: rolesError } = await Promise.race([
          rolesPromise,
          rolesTimeout
        ]) as any;

        if (!rolesError && userRoles) {
          const transformedRoles: UserRole[] = userRoles.map((role: any) => ({
            role: role.role_name as AppRole,
            company_id: role.company_id
          }));
          setRoles(transformedRoles);
        } else {
          console.warn('Roles fetch failed:', rolesError);
          setRoles([]);
        }
      } catch (error) {
        console.warn('Roles fetch timed out or failed:', error);
        setRoles([]);
      }

    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      isRefreshingUserData.current = false;
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setProfile(null);
    setIsSuperAdmin(false);
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Debounced user data refresh
          setTimeout(async () => {
            if (!isRefreshingUserData.current) {
              await refreshUserData();
            }
            setLoading(false);
          }, 500);
        } else {
          setRoles([]);
          setProfile(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          if (!isRefreshingUserData.current) {
            await refreshUserData();
          }
          setLoading(false);
        }, 500);
      } else {
        setLoading(false);
      }
    });

    // Safety timeout - always stop loading after reasonable time
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Auth loading timeout reached');
      setLoading(false);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [refreshUserData]);

  const value = {
    user,
    session,
    loading,
    roles,
    profile,
    isSuperAdmin,
    hasRole,
    hasModuleAccess,
    signIn,
    signUp,
    signOut,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
