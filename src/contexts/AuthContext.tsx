
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  company_id?: string;
  avatar_url?: string;
}

interface UserCompany {
  company_id: string;
  rol: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  userCompanies: UserCompany[];
  currentCompany: UserCompany | null;
  hasRole: (role: string, companyId?: string) => boolean;
  canAccessModule: (module: string) => boolean;
  refreshUserData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setCurrentCompany: (company: UserCompany) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Definir permisos por módulo y rol
const MODULE_PERMISSIONS = {
  dashboard: ['admin', 'editor', 'lector'],
  empleados: ['admin', 'editor', 'lector'],
  nomina: ['admin', 'editor'],
  pagos: ['admin', 'editor'],
  comprobantes: ['admin', 'editor', 'lector'],
  reportes: ['admin', 'editor', 'lector'],
  configuracion: ['admin'],
  'super-admin': ['superadmin'], // Solo para superadmin
  backoffice: ['superadmin'] // Módulo interno para superadmin
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [currentCompany, setCurrentCompanyState] = useState<UserCompany | null>(null);

  const refreshUserData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.log('❌ AuthContext: No user found');
        setProfile(null);
        setIsSuperAdmin(false);
        setUserCompanies([]);
        setCurrentCompanyState(null);
        setUser(null);
        return;
      }

      console.log('🔍 AuthContext: Current user found:', currentUser.email);
      setUser(currentUser);

      // Verificar si es superadmin
      try {
        const { data: superAdminCheck } = await supabase.rpc('is_superadmin', {
          _user_id: currentUser.id
        });

        const isSuper = !!superAdminCheck;
        console.log('🔐 AuthContext: Is SuperAdmin:', isSuper);
        setIsSuperAdmin(isSuper);
      } catch (error) {
        console.warn('Could not check superadmin status:', error);
        setIsSuperAdmin(false);
      }

      // Obtener perfil del usuario
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        setProfile(profileData);
      } catch (error) {
        console.warn('Could not fetch profile:', error);
        setProfile(null);
      }

      // Obtener empresas y roles del usuario
      try {
        const { data: companiesData } = await supabase.rpc('get_user_companies', {
          _user_id: currentUser.id
        });

        const companies: UserCompany[] = companiesData || [];
        console.log('🏢 AuthContext: User companies:', companies);
        setUserCompanies(companies);

        // Establecer empresa actual si no hay una seleccionada
        if (companies.length > 0 && !currentCompany) {
          setCurrentCompanyState(companies[0]);
        }
      } catch (error) {
        console.warn('Could not fetch user companies:', error);
        setUserCompanies([]);
      }

    } catch (error) {
      console.error('Error in refreshUserData:', error);
      setUser(null);
      setProfile(null);
      setIsSuperAdmin(false);
      setUserCompanies([]);
      setCurrentCompanyState(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setIsSuperAdmin(false);
      setUserCompanies([]);
      setCurrentCompanyState(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const setCurrentCompany = (company: UserCompany) => {
    setCurrentCompanyState(company);
  };

  const hasRole = (role: string, companyId?: string): boolean => {
    // Superadmin siempre tiene todos los roles
    if (isSuperAdmin && role !== 'superadmin') {
      return true;
    }

    // Verificar rol específico para superadmin
    if (role === 'superadmin') {
      return isSuperAdmin;
    }

    // Para roles normales, verificar en la empresa especificada o actual
    const targetCompanyId = companyId || currentCompany?.company_id;
    if (!targetCompanyId) return false;

    const companyRole = userCompanies.find(uc => 
      uc.company_id === targetCompanyId
    );

    return companyRole?.rol === role;
  };

  const canAccessModule = (module: string): boolean => {
    // Superadmin puede acceder a todo
    if (isSuperAdmin) {
      console.log('✅ AuthContext: SuperAdmin access granted for module:', module);
      return true;
    }

    // Verificar permisos específicos del módulo
    const requiredRoles = MODULE_PERMISSIONS[module as keyof typeof MODULE_PERMISSIONS];
    if (!requiredRoles) {
      console.log('❓ AuthContext: Module not found:', module);
      return false;
    }

    // Si no hay empresa actual, no puede acceder
    if (!currentCompany) {
      console.log('❌ AuthContext: No current company selected');
      return false;
    }

    const hasAccess = requiredRoles.includes(currentCompany.rol);
    console.log(`🔐 AuthContext: Module ${module} access:`, hasAccess, 'User role:', currentCompany.rol, 'Required roles:', requiredRoles);
    
    return hasAccess;
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthStateChange = async (event: string, session: any) => {
      if (!mounted) return;

      console.log('🔄 AuthContext: Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          setTimeout(() => {
            if (mounted) {
              refreshUserData();
            }
          }, 100);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsSuperAdmin(false);
        setUserCompanies([]);
        setCurrentCompanyState(null);
      }
      
      if (mounted) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        setTimeout(() => {
          if (mounted) {
            refreshUserData();
          }
        }, 100);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isSuperAdmin,
    userCompanies,
    currentCompany,
    hasRole,
    canAccessModule,
    refreshUserData,
    signIn,
    signUp,
    signOut,
    setCurrentCompany
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
