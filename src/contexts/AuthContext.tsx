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
      console.log('🔍 hasRole: No roles available');
      return false;
    }
    
    const result = roles.some(r => {
      const roleMatch = r.role === role;
      const companyMatch = companyId ? r.company_id === companyId : true;
      return roleMatch && companyMatch;
    });
    
    console.log(`🔍 hasRole(${role}${companyId ? `, ${companyId}` : ''}):`, result);
    return result;
  }, [roles]);

  const hasModuleAccess = useCallback((module: string): boolean => {
    console.log(`🔍 hasModuleAccess(${module}) called`);
    console.log('🔍 Current roles:', roles);
    
    if (roles.length === 0) {
      console.log('🔍 hasModuleAccess: No roles available, returning false');
      return false;
    }
    
    const hasAccess = roles.some(userRole => {
      const permissions = ROLE_PERMISSIONS[userRole.role];
      const hasPermission = permissions?.includes(module);
      console.log(`🔍 Role ${userRole.role} permissions for ${module}:`, hasPermission);
      return hasPermission;
    });
    
    console.log(`🔍 hasModuleAccess(${module}) result:`, hasAccess);
    return hasAccess;
  }, [roles]);

  const refreshUserData = useCallback(async () => {
    if (isRefreshingUserData.current) {
      console.log('🔄 User data refresh already in progress, skipping...');
      return;
    }

    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      console.log('❌ No current user found for refresh');
      return;
    }

    isRefreshingUserData.current = true;
    console.log('🔄 Refreshing user data for:', currentUser.email);

    try {
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
        } else {
          console.log('⚠️ User has no company assigned');
        }
      } else {
        console.error('❌ Error fetching user profile:', profileError);
        setProfile(null);
      }

      // Fetch roles
      const { data: userRoles, error: rolesError } = await supabase
        .rpc('get_user_companies_simple', { _user_id: currentUser.id });
      
      if (!rolesError && userRoles) {
        const transformedRoles: UserRole[] = userRoles.map((role: any) => ({
          role: role.role_name as AppRole,
          company_id: role.company_id
        }));
        setRoles(transformedRoles);
        console.log('👥 User roles fetched:', transformedRoles.length, 'roles:', transformedRoles);
      } else {
        console.error('❌ Error fetching user roles:', rolesError);
        console.log('🔄 Setting empty roles array as fallback');
        setRoles([]);
      }

    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
      setRoles([]);
    } finally {
      isRefreshingUserData.current = false;
      console.log('✅ User data refresh completed');
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
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    console.log('🚀 AuthProvider initializing...');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Debounce user data refresh
          setTimeout(async () => {
            if (!isRefreshingUserData.current) {
              await refreshUserData();
            }
            console.log('✅ Setting loading to false after user data refresh');
            setLoading(false);
          }, 300);
        } else {
          console.log('❌ No session, clearing user data');
          setRoles([]);
          setProfile(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Initial session check:', session?.user?.email || 'no session');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          if (!isRefreshingUserData.current) {
            await refreshUserData();
          }
          console.log('✅ Setting loading to false after initial session check');
          setLoading(false);
        }, 300);
      } else {
        console.log('✅ No initial session, setting loading to false');
        setLoading(false);
      }
    });

    // Reduced timeout for faster loading
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Auth loading timeout reached, setting loading to false');
      setLoading(false);
    }, 3000);

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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
