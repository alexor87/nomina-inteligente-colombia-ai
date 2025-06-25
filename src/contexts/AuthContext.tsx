import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  nit: string;
  rol?: string;
}

interface UserCompany {
  company_id: string;
  rol: string;
}

interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  company_id?: string;
  avatar_url?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  currentCompany: Company | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  hasRole: (role: 'admin' | 'editor' | 'lector') => boolean;
  canAccessModule: (module: string) => boolean;
  switchCompany: (companyId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  userCompanies: UserCompany[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();

  const checkSuperAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('is_superadmin', {
        _user_id: userId
      });
      
      if (error) {
        console.error('Error checking superadmin status:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error in checkSuperAdmin:', error);
      return false;
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      return null;
    }
  };

  const loadUserCompanies = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_companies', {
        _user_id: userId
      });

      if (error) {
        console.error('Error loading user companies:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadUserCompanies:', error);
      return [];
    }
  };

  const loadCurrentCompany = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, razon_social, nit')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('Error loading company:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.razon_social,
        nit: data.nit
      };
    } catch (error) {
      console.error('Error in loadCurrentCompany:', error);
      return null;
    }
  };

  const initializeUserData = async (user: User) => {
    try {
      console.log('🔄 Initializing user data for:', user.email);

      // Check if user is superadmin first
      const superAdminStatus = await checkSuperAdmin(user.id);
      setIsSuperAdmin(superAdminStatus);
      console.log('👑 SuperAdmin status:', superAdminStatus);

      // Load user profile
      const profileData = await loadUserProfile(user.id);
      setProfile(profileData);
      console.log('👤 Profile loaded:', profileData);

      // Load user companies
      const companies = await loadUserCompanies(user.id);
      setUserCompanies(companies);
      console.log('🏢 User companies:', companies);

      // Set current company
      if (superAdminStatus) {
        // For superadmin, always load the first available company
        console.log('🔄 Loading first available company for superadmin...');
        try {
          const { data: firstCompany, error } = await supabase
            .from('companies')
            .select('id, razon_social, nit')
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error('Error loading first company:', error);
          } else if (firstCompany) {
            setCurrentCompany({
              id: firstCompany.id,
              name: firstCompany.razon_social,
              nit: firstCompany.nit,
              rol: 'superadmin'
            });
            console.log('✅ SuperAdmin using first company:', firstCompany.razon_social);
          } else {
            console.warn('No companies available in the system');
          }
        } catch (error) {
          console.error('Error fetching first company:', error);
        }
      } else if (companies.length > 0) {
        // For regular users, use their first assigned company
        const firstCompany = companies[0];
        const companyData = await loadCurrentCompany(firstCompany.company_id);
        
        if (companyData) {
          setCurrentCompany({
            ...companyData,
            rol: firstCompany.rol
          });
          console.log('✅ Current company set:', companyData.name);
        }
      } else {
        console.warn('⚠️ User has no companies assigned and is not superadmin');
      }

      console.log('✅ User data initialization completed');
    } catch (error) {
      console.error('❌ Error initializing user data:', error);
    } finally {
      // Always set loading to false, even if there's an error
      setLoading(false);
      console.log('🔄 Loading state set to false');
    }
  };

  const refreshUserData = async () => {
    if (user) {
      setLoading(true);
      await initializeUserData(user);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email);
      
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await initializeUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setCurrentCompany(null);
        setUserCompanies([]);
        setIsSuperAdmin(false);
        setLoading(false);
        console.log('🔄 Auth cleared, loading set to false');
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('🔄 Found existing session for:', session.user.email);
        setUser(session.user);
        initializeUserData(session.user);
      } else {
        console.log('🔄 No existing session found');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido de vuelta",
      });
    } catch (error: any) {
      console.error('SignIn error:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    } catch (error: any) {
      console.error('SignOut error:', error);
      throw new Error(error.message || 'Error al cerrar sesión');
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Registro exitoso",
        description: "Revisa tu email para confirmar tu cuenta",
      });
    } catch (error: any) {
      console.error('SignUp error:', error);
      throw new Error(error.message || 'Error al registrarse');
    }
  };

  const hasRole = (role: 'admin' | 'editor' | 'lector'): boolean => {
    if (isSuperAdmin) return true;
    
    if (!currentCompany || userCompanies.length === 0) return false;
    
    const currentCompanyRelation = userCompanies.find(
      uc => uc.company_id === currentCompany.id
    );
    
    if (!currentCompanyRelation) return false;
    
    const userRole = currentCompanyRelation.rol;
    
    switch (role) {
      case 'admin':
        return userRole === 'admin';
      case 'editor':
        return userRole === 'admin' || userRole === 'editor';
      case 'lector':
        return ['admin', 'editor', 'lector'].includes(userRole);
      default:
        return false;
    }
  };

  const canAccessModule = (module: string): boolean => {
    // SuperAdmin can access everything
    if (isSuperAdmin) {
      console.log('✅ SuperAdmin access granted for module:', module);
      return true;
    }
    
    // For non-superadmin users, check if they have at least lector role in current company
    const hasAccess = !!currentCompany && hasRole('lector');
    console.log('🔍 Module access check:', { module, hasAccess, currentCompany: !!currentCompany, hasRole: hasRole('lector') });
    return hasAccess;
  };

  const switchCompany = async (companyId: string) => {
    try {
      const companyData = await loadCurrentCompany(companyId);
      if (companyData) {
        const companyRelation = userCompanies.find(uc => uc.company_id === companyId);
        setCurrentCompany({
          ...companyData,
          rol: companyRelation?.rol
        });
        toast({
          title: "Empresa cambiada",
          description: `Ahora estás trabajando en ${companyData.name}`,
        });
      }
    } catch (error) {
      console.error('Error switching company:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar de empresa",
        variant: "destructive"
      });
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    currentCompany,
    loading,
    isAuthenticated: !!user,
    isSuperAdmin,
    signIn,
    signOut,
    signUp,
    hasRole,
    canAccessModule,
    switchCompany,
    refreshUserData,
    userCompanies
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
