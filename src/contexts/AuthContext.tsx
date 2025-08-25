
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRoleManagement } from '@/hooks/useRoleManagement';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  company_id?: string;
}

type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';

interface UserRole {
  role: AppRole;
  company_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
  isLoadingRoles: boolean;
  hasOptimisticRole: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  hasRole: (role: AppRole, companyId?: string) => boolean;
  hasModuleAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Use role management hook
  const { roles, isLoadingRoles, hasOptimisticRole } = useRoleManagement(user, profile);

  // Check if user is super admin
  const isSuperAdmin = user?.email === 'admin@finppi.com' || false;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user as User || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user as User || null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const logout = () => {
    signOut();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const hasRole = (role: AppRole, companyId?: string) => {
    if (isSuperAdmin) return true;
    
    return roles.some(userRole => {
      if (companyId) {
        return userRole.role === role && userRole.company_id === companyId;
      }
      return userRole.role === role;
    });
  };

  const hasModuleAccess = (module: string) => {
    if (isSuperAdmin) return true;
    
    // Define module access based on roles
    const moduleRoleMap: Record<string, AppRole[]> = {
      'dashboard': ['administrador', 'rrhh', 'contador', 'visualizador', 'soporte'],
      'employees': ['administrador', 'rrhh', 'soporte'],
      'payroll': ['administrador', 'rrhh', 'contador'],
      'payroll-history': ['administrador', 'rrhh', 'contador', 'visualizador'],
      'prestaciones-sociales': ['administrador', 'rrhh', 'contador'],
      'vacations-absences': ['administrador', 'rrhh'],
      'reports': ['administrador', 'rrhh', 'contador', 'visualizador'],
      'settings': ['administrador', 'soporte']
    };

    const allowedRoles = moduleRoleMap[module] || [];
    return roles.some(userRole => allowedRoles.includes(userRole.role));
  };

  const value = {
    user,
    session,
    profile,
    roles,
    loading: loading || isLoadingRoles,
    isLoadingRoles,
    hasOptimisticRole,
    isSuperAdmin,
    login,
    logout,
    signIn,
    signUp,
    signOut,
    refreshUserData,
    hasRole,
    hasModuleAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
