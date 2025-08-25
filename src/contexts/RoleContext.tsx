
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';

interface UserRole {
  role: AppRole;
  company_id?: string;
}

interface RoleContextType {
  roles: UserRole[];
  loading: boolean;
  hasRole: (role: AppRole, companyId?: string) => boolean;
  hasModuleAccess: (module: string) => boolean;
  isSuperAdmin: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRoles = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRoles must be used within RoleProvider');
  }
  return context;
};

interface RoleProviderProps {
  children: React.ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.email === 'admin@finppi.com' || false;

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    fetchRoles();
  }, [user, profile]);

  const fetchRoles = async () => {
    if (!user) return;

    console.log('👤 Fetching roles for user:', user.email);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } else {
        const userRoles: UserRole[] = data.map((role: any) => ({
          role: role.role as AppRole,
          company_id: role.company_id
        }));
        
        console.log('✅ Roles loaded:', userRoles);
        setRoles(userRoles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
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
    roles,
    loading,
    hasRole,
    hasModuleAccess,
    isSuperAdmin,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};
