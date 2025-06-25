
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  soporte: ['dashboard', 'reports']
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const hasRole = (role: AppRole, companyId?: string): boolean => {
    if (isSuperAdmin) return true;
    
    return roles.some(r => 
      r.role === role && 
      (companyId ? r.company_id === companyId : true)
    );
  };

  const hasModuleAccess = (module: string): boolean => {
    if (isSuperAdmin) return true;
    
    // Verificar si alguno de los roles del usuario tiene acceso al módulo
    return roles.some(userRole => 
      ROLE_PERMISSIONS[userRole.role]?.includes(module)
    );
  };

  const refreshUserData = async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return;

    try {
      // Verificar si es superadmin
      const { data: superAdminStatus, error: superAdminError } = await supabase
        .rpc('is_superadmin');
      
      if (!superAdminError) {
        setIsSuperAdmin(superAdminStatus || false);
        console.log('SuperAdmin status:', superAdminStatus);
      }

      // Obtener roles del usuario
      const { data: userRoles, error: rolesError } = await supabase
        .rpc('get_user_roles');
      
      if (!rolesError && userRoles) {
        setRoles(userRoles);
        console.log('User roles fetched:', userRoles);
      } else {
        console.error('Error fetching user roles:', rolesError);
        setRoles([]);
      }

      // Obtener perfil del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
      
      if (!profileError && profileData) {
        setProfile(profileData);
        console.log('User profile fetched:', profileData);
      } else {
        console.error('Error fetching user profile:', profileError);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data after successful auth
          setTimeout(async () => {
            await refreshUserData();
          }, 0);
        } else {
          setRoles([]);
          setProfile(null);
          setIsSuperAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
