
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
  
  // Refs to prevent redundant calls
  const isRefreshingUserData = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasRole = useCallback((role: AppRole, companyId?: string): boolean => {
    if (roles.length === 0) {
      return false;
    }
    
    return roles.some(r => {
      const roleMatch = r.role === role;
      const companyMatch = companyId ? r.company_id === companyId : true;
      return roleMatch && companyMatch;
    });
  }, [roles]);

  const hasModuleAccess = useCallback((module: string): boolean => {
    if (roles.length === 0) {
      return false;
    }
    
    return roles.some(userRole => {
      return ROLE_PERMISSIONS[userRole.role]?.includes(module);
    });
  }, [roles]);

  const refreshUserData = useCallback(async () => {
    if (isRefreshingUserData.current) {
      console.log('🔄 User data refresh already in progress, skipping...');
      return;
    }

    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      console.log('❌ No current user found');
      return;
    }

    isRefreshingUserData.current = true;
    console.log('🔄 Refreshing user data for:', currentUser.email);

    try {
      // Verificar si el registro está completo
      const isComplete = await verifyUserRegistrationComplete(currentUser.id);
      
      if (!isComplete) {
        console.warn('⚠️ User registration incomplete, attempting to fix...');
        if (currentUser.email) {
          await fixIncompleteRegistration(currentUser.email);
          // Esperar un momento y reintentar
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
      
      if (!profileError && profileData) {
        setProfile(profileData);
        console.log('👤 User profile fetched successfully');
        
        // Only run role check if user has a company
        if (profileData.company_id) {
          console.log('🔧 Running role check for company:', profileData.company_id);
          await performCompleteRoleCheck(currentUser.id);
        }
      } else {
        console.error('❌ Error fetching user profile:', profileError);
        setProfile(null);
      }

      // Fetch roles with retry logic
      let rolesData = null;
      let rolesError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await supabase
          .rpc('get_user_companies_simple', { _user_id: currentUser.id });
        
        rolesData = result.data;
        rolesError = result.error;
        
        if (!rolesError && rolesData && rolesData.length > 0) {
          break;
        }
        
        console.log(`⏳ Roles fetch attempt ${attempt + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!rolesError && rolesData) {
        const transformedRoles: UserRole[] = rolesData.map((role: any) => ({
          role: role.role_name as AppRole,
          company_id: role.company_id
        }));
        setRoles(transformedRoles);
        console.log('👥 User roles fetched:', transformedRoles.length, 'roles');
      } else {
        console.error('❌ Error fetching user roles after retries:', rolesError);
        setRoles([]);
      }

    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    } finally {
      isRefreshingUserData.current = false;
    }
  }, []);

  // Verificar si el registro del usuario está completo
  const verifyUserRegistrationComplete = async (userId: string): Promise<boolean> => {
    try {
      // Verificar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.company_id) {
        return false;
      }

      // Verificar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      return !rolesError && roles && roles.length > 0;
    } catch (error) {
      console.error('❌ Error verifying user registration:', error);
      return false;
    }
  };

  // Corregir registro incompleto
  const fixIncompleteRegistration = async (userEmail: string): Promise<void> => {
    try {
      console.log('🔧 Fixing incomplete registration for:', userEmail);
      
      const { data, error } = await supabase.rpc('complete_incomplete_registration', {
        p_user_email: userEmail
      });

      if (error) {
        console.error('❌ Error fixing registration:', error);
        throw error;
      }

      // Type guard for the response data
      if (data && typeof data === 'object' && 'success' in data && data.success) {
        console.log('✅ Registration fixed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to fix incomplete registration:', error);
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

  useEffect(() => {
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
          // Debounce user data refresh with increased delay for registration processes
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
      console.log('🔍 Initial session check:', session?.user?.email);
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

    // Increased timeout for registration processes
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Auth loading timeout reached, setting loading to false');
      setLoading(false);
    }, 5000);

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
