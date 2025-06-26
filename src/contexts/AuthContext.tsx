import React, { createContext, useContext, useEffect, useState } from 'react';
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

// Matriz de permisos por rol
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  administrador: ['dashboard', 'employees', 'payroll', 'payroll-history', 'vouchers', 'payments', 'reports', 'settings'],
  rrhh: ['dashboard', 'employees', 'payroll-history', 'vouchers', 'reports'],
  contador: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
  visualizador: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
  soporte: ['dashboard', 'reports', 'employees'] // Agregar acceso a empleados para soporte
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // Siempre false ahora

  const hasRole = (role: AppRole, companyId?: string): boolean => {
    console.log('🔍 Checking role:', { 
      role, 
      companyId, 
      roles,
      userEmail: user?.email,
      profileCompanyId: profile?.company_id 
    });
    
    if (roles.length === 0) {
      console.log('❌ No roles found for user');
      return false;
    }
    
    const hasRoleAccess = roles.some(r => {
      const roleMatch = r.role === role;
      const companyMatch = companyId ? r.company_id === companyId : true;
      console.log('🔍 Role check:', { 
        userRole: r.role, 
        roleMatch, 
        companyMatch, 
        requiredRole: role,
        userCompanyId: r.company_id,
        requiredCompanyId: companyId
      });
      return roleMatch && companyMatch;
    });
    
    console.log('📊 Role access result:', hasRoleAccess);
    return hasRoleAccess;
  };

  const hasModuleAccess = (module: string): boolean => {
    console.log('🔍 Checking module access:', { 
      module, 
      roles,
      userEmail: user?.email,
      rolesDetail: roles.map(r => ({ role: r.role, company_id: r.company_id }))
    });
    
    if (roles.length === 0) {
      console.log('❌ No roles found - denying module access');
      return false;
    }
    
    // Verificar si alguno de los roles del usuario tiene acceso al módulo
    const hasAccess = roles.some(userRole => {
      const moduleAccess = ROLE_PERMISSIONS[userRole.role]?.includes(module);
      console.log('🔍 Module check:', { 
        userRole: userRole.role, 
        module, 
        moduleAccess,
        availableModules: ROLE_PERMISSIONS[userRole.role]
      });
      return moduleAccess;
    });
    
    console.log('📊 Module access result:', hasAccess);
    return hasAccess;
  };

  const refreshUserData = async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      console.log('❌ No current user found');
      return;
    }

    console.log('🔄 Refreshing user data for:', currentUser.email);

    try {
      // Obtener perfil del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
      
      if (!profileError && profileData) {
        setProfile(profileData);
        console.log('👤 User profile fetched:', profileData);
        
        // Si el usuario tiene una empresa, ejecutar verificación completa de roles
        if (profileData.company_id) {
          console.log('🔧 Performing complete role check...');
          await performCompleteRoleCheck(currentUser.id);
        }
      } else {
        console.error('❌ Error fetching user profile:', profileError);
        setProfile(null);
      }

      // Obtener roles del usuario usando la nueva función
      const { data: userRoles, error: rolesError } = await supabase
        .rpc('get_user_companies_simple', { _user_id: currentUser.id });
      
      if (!rolesError && userRoles) {
        const transformedRoles: UserRole[] = userRoles.map((role: any) => ({
          role: role.role_name as AppRole,
          company_id: role.company_id
        }));
        setRoles(transformedRoles);
        console.log('👥 User roles fetched:', transformedRoles);
      } else {
        console.error('❌ Error fetching user roles:', rolesError);
        setRoles([]);
      }

    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  };

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

  const value = {
    user,
    session,
    loading,
    roles,
    profile,
    isSuperAdmin,
    hasRole,
    hasModuleAccess,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
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
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setRoles([]);
      setProfile(null);
      setIsSuperAdmin(false);
    },
    refreshUserData,
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data after successful auth with shorter delay
          setTimeout(async () => {
            await refreshUserData();
            setLoading(false); // Mover aquí para asegurar que se completa la carga
          }, 500); // Reducir delay pero asegurar que los triggers se procesen
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
      console.log('🔍 Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await refreshUserData();
          setLoading(false);
        }, 500);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
