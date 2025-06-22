
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';

export interface UserProfile {
  id: string;
  user_id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export interface UserRoleData {
  role: UserRole;
  company_id: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRoleData[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole, companyId?: string) => boolean;
  getCurrentCompanyId: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRoleData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    console.log('🔄 Starting loadUserData for:', userId);
    setLoading(true);
    
    try {
      // Cargar perfil con timeout
      console.log('📋 Loading profile...');
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const profileResult = await Promise.race([
        profilePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile query timeout')), 5000)
        )
      ]);

      const { data: profileData, error: profileError } = profileResult as any;

      if (profileError) {
        console.error('❌ Profile error:', profileError.message);
        setProfile(null);
      } else if (profileData) {
        console.log('✅ Profile loaded successfully');
        setProfile(profileData);
      } else {
        console.log('⚠️ No profile data found');
        setProfile(null);
      }

      // Cargar roles con timeout
      console.log('🔄 Loading roles...');
      const rolesPromise = supabase
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', userId);

      const rolesResult = await Promise.race([
        rolesPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Roles query timeout')), 5000)
        )
      ]);

      const { data: rolesData, error: rolesError } = rolesResult as any;

      if (rolesError) {
        console.error('❌ Roles error:', rolesError.message);
        setRoles([]);
      } else if (rolesData && Array.isArray(rolesData)) {
        console.log('✅ Roles loaded:', rolesData.length, 'roles found');
        setRoles(rolesData as UserRoleData[]);
      } else {
        console.log('⚠️ No roles data returned');
        setRoles([]);
      }

    } catch (error) {
      console.error('💥 Error in loadUserData:', error);
      setProfile(null);
      setRoles([]);
    } finally {
      console.log('🏁 loadUserData completed, setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider initializing...');
    
    // Configurar listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Cargar datos del usuario cuando se autentica
          await loadUserData(session.user.id);
        } else {
          console.log('👤 No user session, clearing data');
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // Verificar sesión existente
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Initial session check:', session?.user?.email || 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('💥 Error checking initial session:', error);
        setLoading(false);
      }
    };

    checkInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: UserRole, companyId?: string): boolean => {
    console.log('🔍 Checking role:', role, 'for user with roles:', roles);
    const hasRoleResult = roles.some(r => 
      r.role === role && 
      (companyId ? r.company_id === companyId : true)
    );
    console.log('✅ Has role result:', hasRoleResult);
    return hasRoleResult;
  };

  const getCurrentCompanyId = (): string | null => {
    const companyId = profile?.company_id || (roles.length > 0 ? roles[0].company_id : null);
    console.log('🏢 Current company ID:', companyId);
    return companyId;
  };

  const value = {
    user,
    session,
    profile,
    roles,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    getCurrentCompanyId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
