
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

// Permisos por rol - SIMPLIFICADOS y ESTABLES
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  administrador: ['dashboard', 'employees', 'payroll', 'payroll-history', 'vouchers', 'payments', 'reports', 'settings'],
  rrhh: ['dashboard', 'employees', 'payroll-history', 'vouchers', 'reports'],
  contador: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
  visualizador: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
  soporte: ['dashboard', 'reports', 'employees']
};

// NAVEGACIÓN BÁSICA SIEMPRE DISPONIBLE (fallback)
const BASIC_MODULES = ['dashboard', 'employees', 'payroll', 'payroll-history', 'reports', 'settings'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const isRefreshingUserData = useRef(false);
  const isInitialized = useRef(false);

  const hasRole = useCallback((role: AppRole, companyId?: string): boolean => {
    try {
      if (roles.length === 0) {
        console.log('⚠️ No roles found, allowing basic access');
        return true; // FALLBACK: permitir acceso básico si no hay roles cargados
      }
      
      return roles.some(r => {
        const roleMatch = r.role === role;
        const companyMatch = companyId ? r.company_id === companyId : true;
        return roleMatch && companyMatch;
      });
    } catch (error) {
      console.error('Error in hasRole:', error);
      return true; // FALLBACK en caso de error
    }
  }, [roles]);

  const hasModuleAccess = useCallback((module: string): boolean => {
    try {
      // FALLBACK CRÍTICO: Si no hay usuario, denegar acceso
      if (!user) {
        return false;
      }

      // FALLBACK: Si no hay roles cargados, permitir módulos básicos
      if (roles.length === 0) {
        console.log('⚠️ No roles loaded, granting basic module access');
        return BASIC_MODULES.includes(module);
      }
      
      // Verificar permisos por rol
      return roles.some(userRole => {
        const permissions = ROLE_PERMISSIONS[userRole.role];
        return permissions && permissions.includes(module);
      });
    } catch (error) {
      console.error('Error in hasModuleAccess:', error);
      // FALLBACK: En caso de error, permitir módulos básicos si hay usuario
      return user ? BASIC_MODULES.includes(module) : false;
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
    console.log('🔄 Refreshing user data for:', currentUser.email);

    try {
      // Cargar perfil con timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile timeout')), 3000)
      );

      try {
        const { data: profileData, error: profileError } = await Promise.race([
          profilePromise,
          profileTimeout
        ]) as any;

        if (!profileError && profileData) {
          setProfile(profileData);
          console.log('✅ Profile loaded:', profileData.company_id ? 'with company' : 'no company');
        } else {
          console.warn('⚠️ Profile load failed:', profileError);
          setProfile(null);
        }
      } catch (error) {
        console.warn('⚠️ Profile timeout or error:', error);
        setProfile(null);
      }

      // Cargar roles con timeout
      const rolesPromise = supabase.rpc('get_user_companies_simple', { _user_id: currentUser.id });
      const rolesTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Roles timeout')), 3000)
      );

      try {
        const { data: userRoles, error: rolesError } = await Promise.race([
          rolesPromise,
          rolesTimeout
        ]) as any;

        if (!rolesError && userRoles && userRoles.length > 0) {
          const transformedRoles: UserRole[] = userRoles.map((role: any) => ({
            role: role.role_name as AppRole,
            company_id: role.company_id
          }));
          setRoles(transformedRoles);
          console.log('✅ Roles loaded:', transformedRoles.length);
        } else {
          console.warn('⚠️ No roles found, will use fallback permissions');
          setRoles([]); // Esto activará los fallbacks
        }
      } catch (error) {
        console.warn('⚠️ Roles timeout or error:', error);
        setRoles([]); // Fallback
      }

    } catch (error) {
      console.error('❌ Error in refreshUserData:', error);
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
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    console.log('🚀 AuthProvider initializing...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Cargar datos del usuario
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

    // Verificar sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Initial session check:', session?.user?.email || 'no session');
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

    // Safety timeout
    setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Auth timeout reached, stopping loading');
        setLoading(false);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUserData, loading]);

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
