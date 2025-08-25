
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { Navigate } from 'react-router-dom';
import { AppLoading } from '@/components/ui/AppLoading';

type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requiredModule?: string;
  companyId?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requiredModule,
  companyId
}) => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, hasModuleAccess, isSuperAdmin, loading: rolesLoading } = useRoles();

  console.log('🛡️ ProtectedRoute check:', {
    user: user?.email,
    authLoading,
    rolesLoading,
    requiredRole,
    requiredModule,
    isSuperAdmin
  });

  if (authLoading || rolesLoading) {
    return <AppLoading message="Verificando permisos..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (requiredRole && !hasRole(requiredRole, companyId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (requiredModule && !hasModuleAccess(requiredModule)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tienes permisos para acceder a este módulo.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
