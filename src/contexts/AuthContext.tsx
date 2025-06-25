
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  roles: string[];
  isSaasAdmin: boolean;
  hasRole: (role: string) => boolean;
  canAccessModule: (module: string) => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Definir permisos por módulo
const MODULE_PERMISSIONS = {
  dashboard: ['administrador', 'rrhh', 'contador', 'visualizador'],
  empleados: ['administrador', 'rrhh'],
  nomina: ['administrador', 'rrhh', 'contador'],
  pagos: ['administrador', 'contador'],
  comprobantes: ['administrador', 'rrhh', 'contador'],
  reportes: ['administrador', 'rrhh', 'contador', 'visualizador'],
  configuracion: ['administrador'],
  'super-admin': ['super_admin']
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSaasAdmin, setIsSaasAdmin] = useState(false);

  const refreshUserData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        console.log('🔍 AuthContext: Current user found:', currentUser.email);
        
        // Verificar si es super admin
        const { data: saasAdminData, error: adminError } = await supabase
          .from('saas_admins')
          .select('role')
          .eq('user_id', currentUser.id)
          .single();

        if (adminError && adminError.code !== 'PGRST116') {
          console.error('Error checking saas admin status:', adminError);
        }

        const isAdmin = !!saasAdminData;
        console.log('🔐 AuthContext: Is SaaS Admin:', isAdmin);
        setIsSaasAdmin(isAdmin);

        // Obtener roles del usuario
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          setRoles([]);
        } else {
          const rolesList = userRoles?.map(r => r.role) || [];
          console.log('👤 AuthContext: User roles:', rolesList);
          setRoles(rolesList);
        }
      } else {
        console.log('❌ AuthContext: No user found');
        setRoles([]);
        setIsSaasAdmin(false);
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error('Error in refreshUserData:', error);
      setUser(null);
      setRoles([]);
      setIsSaasAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar datos iniciales
    refreshUserData();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          await refreshUserData();
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRoles([]);
        setIsSaasAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  const canAccessModule = (module: string): boolean => {
    // Super admins pueden acceder a todo
    if (isSaasAdmin) {
      console.log('✅ AuthContext: Super admin access granted for module:', module);
      return true;
    }

    // Verificar permisos específicos del módulo
    const requiredRoles = MODULE_PERMISSIONS[module as keyof typeof MODULE_PERMISSIONS];
    if (!requiredRoles) {
      console.log('❓ AuthContext: Module not found:', module);
      return false;
    }

    const hasAccess = roles.some(role => requiredRoles.includes(role));
    console.log(`🔐 AuthContext: Module ${module} access:`, hasAccess, 'User roles:', roles, 'Required roles:', requiredRoles);
    
    return hasAccess;
  };

  const value: AuthContextType = {
    user,
    loading,
    roles,
    isSaasAdmin,
    hasRole,
    canAccessModule,
    refreshUserData
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
