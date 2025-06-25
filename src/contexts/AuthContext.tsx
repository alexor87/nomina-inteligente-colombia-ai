
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  nit: string;
}

interface UserCompany {
  company_id: string;
  rol: string;
}

interface AuthContextType {
  user: User | null;
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
  userCompanies: UserCompany[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
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
      setLoading(true);
      console.log('🔄 Initializing user data for:', user.email);

      // Check if user is superadmin
      const superAdminStatus = await checkSuperAdmin(user.id);
      setIsSuperAdmin(superAdminStatus);
      console.log('👑 SuperAdmin status:', superAdminStatus);

      // Load user companies
      const companies = await loadUserCompanies(user.id);
      setUserCompanies(companies);
      console.log('🏢 User companies:', companies);

      if (companies.length > 0) {
        // Set the first company as current company
        const firstCompany = companies[0];
        const companyData = await loadCurrentCompany(firstCompany.company_id);
        
        if (companyData) {
          setCurrentCompany(companyData);
          console.log('✅ Current company set:', companyData.name);
        }
      } else if (superAdminStatus) {
        // If superadmin but no companies assigned, load the first available company
        const { data: firstCompany } = await supabase
          .from('companies')
          .select('id, razon_social, nit')
          .limit(1)
          .single();

        if (firstCompany) {
          setCurrentCompany({
            id: firstCompany.id,
            name: firstCompany.razon_social,
            nit: firstCompany.nit
          });
          console.log('✅ SuperAdmin using first company:', firstCompany.razon_social);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        initializeUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        await initializeUserData(session.user);
      } else {
        setUser(null);
        setCurrentCompany(null);
        setUserCompanies([]);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
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

  const signOut = async () => {
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
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
    if (isSuperAdmin) return true;
    
    // For now, all authenticated users with a company can access all modules
    // This can be expanded based on specific module permissions
    return !!currentCompany && hasRole('lector');
  };

  const switchCompany = async (companyId: string) => {
    try {
      const companyData = await loadCurrentCompany(companyId);
      if (companyData) {
        setCurrentCompany(companyData);
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
