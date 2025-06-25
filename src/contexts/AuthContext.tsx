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
    console.log('🔍 Checking role:', { 
      role, 
      companyId, 
      isSuperAdmin, 
      roles,
      userEmail: user?.email,
      profileCompanyId: profile?.company_id 
    });
    
    if (isSuperAdmin) {
      console.log('✅ SuperAdmin access granted');
      return true;
    }
    
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
      isSuperAdmin, 
      roles,
      userEmail: user?.email,
      rolesDetail: roles.map(r => ({ role: r.role, company_id: r.company_id }))
    });
    
    if (isSuperAdmin) {
      console.log('✅ SuperAdmin module access granted');
      return true;
    }
    
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
      // Verificar si es superadmin
      const { data: superAdminStatus, error: superAdminError } = await supabase
        .rpc('is_superadmin');
      
      if (!superAdminError) {
        setIsSuperAdmin(superAdminStatus || false);
        console.log('👑 SuperAdmin status:', superAdminStatus);
      } else {
        console.error('❌ Error checking superadmin status:', superAdminError);
      }

      // Obtener roles del usuario
      const { data: userRoles, error: rolesError } = await supabase
        .rpc('get_user_roles');
      
      if (!rolesError && userRoles) {
        setRoles(userRoles);
        console.log('👥 User roles fetched:', userRoles);
      } else {
        console.error('❌ Error fetching user roles:', rolesError);
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
        console.log('👤 User profile fetched:', profileData);
        
        // Si el usuario tiene una empresa asignada pero no tiene roles, intentar crear rol de administrador
        if (profileData.company_id && (!userRoles || userRoles.length === 0)) {
          console.log('🔧 User has company but no roles, attempting to assign admin role...');
          const { error: roleAssignError } = await supabase
            .from('user_roles')
            .insert({
              user_id: currentUser.id,
              role: 'administrador',
              company_id: profileData.company_id,
              assigned_by: currentUser.id
            });
          
          if (!roleAssignError) {
            console.log('✅ Admin role assigned successfully');
            // Refresh roles after assignment
            const { data: newRoles } = await supabase
              .rpc('get_user_roles');
            if (newRoles) {
              setRoles(newRoles);
              console.log('👥 Updated user roles:', newRoles);
            }
          } else {
            console.error('❌ Error assigning admin role:', roleAssignError);
          }
        }
      } else {
        console.error('❌ Error fetching user profile:', profileError);
        
        // Si no existe perfil, intentar crearlo
        if (profileError?.code === 'PGRST116') {
          console.log('🔧 Creating missing profile...');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: currentUser.id,
              first_name: currentUser.user_metadata?.first_name || '',
              last_name: currentUser.user_metadata?.last_name || '',
            })
            .select()
            .single();
          
          if (!createError && newProfile) {
            setProfile(newProfile);
            console.log('✅ Profile created:', newProfile);
          } else {
            console.error('❌ Error creating profile:', createError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data after successful auth
          setTimeout(async () => {
            await refreshUserData();
          }, 100);
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
      console.log('🔍 Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await refreshUserData();
        }, 100);
      }
      
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
