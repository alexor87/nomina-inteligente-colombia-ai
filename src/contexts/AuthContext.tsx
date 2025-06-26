
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
  soporte: ['dashboard', 'reports', 'employees']
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        console.log('❌ No current user found in refreshUserData');
        return;
      }

      console.log('🔄 Refreshing user data for:', currentUser.email);

      // Obtener perfil del usuario con retry logic
      let profileData = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
          
          if (!error && data) {
            profileData = data;
            break;
          } else if (error && error.code === 'PGRST116') {
            console.log(`⏳ Profile not found, attempt ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error('❌ Error fetching profile:', error);
            break;
          }
        } catch (err) {
          console.error('❌ Exception fetching profile:', err);
          break;
        }
        attempts++;
      }

      if (profileData) {
        setProfile(profileData);
        console.log('✅ User profile loaded:', profileData);
        
        // Si el usuario tiene una empresa, ejecutar verificación completa de roles
        if (profileData.company_id) {
          console.log('🔧 Performing complete role check...');
          await performCompleteRoleCheck(currentUser.id);
        }
      } else {
        console.log('⚠️ No profile found after all attempts');
        setProfile(null);
      }

      // Obtener roles del usuario con retry logic
      let rolesData = [];
      attempts = 0;

      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase
            .rpc('get_user_companies_simple', { _user_id: currentUser.id });
          
          if (!error && data) {
            rolesData = data;
            break;
          } else {
            console.log(`⏳ Roles not found, attempt ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error('❌ Exception fetching roles:', err);
          break;
        }
        attempts++;
      }

      if (rolesData && rolesData.length > 0) {
        const transformedRoles: UserRole[] = rolesData.map((role: any) => ({
          role: role.role_name as AppRole,
          company_id: role.company_id
        }));
        setRoles(transformedRoles);
        console.log('✅ User roles loaded:', transformedRoles);
      } else {
        console.log('⚠️ No roles found after all attempts');
        setRoles([]);
      }

    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
      setRoles([]);
      setProfile(null);
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
    signIn,
    signUp,
    signOut,
    refreshUserData,
  };

  useEffect(() => {
    console.log('🔄 Setting up auth state listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', { event, userEmail: session?.user?.email });
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 User authenticated, refreshing data...');
          // Usar setTimeout para evitar bloquear el callback
          setTimeout(async () => {
            await refreshUserData();
            setLoading(false);
          }, 500);
        } else {
          console.log('👤 User not authenticated, clearing data...');
          setRoles([]);
          setProfile(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Initial session check:', { userEmail: session?.user?.email });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('👤 Existing session found, refreshing data...');
        setTimeout(async () => {
          await refreshUserData();
          setLoading(false);
        }, 500);
      } else {
        console.log('👤 No existing session found');
        setLoading(false);
      }
    });

    return () => {
      console.log('🔄 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
