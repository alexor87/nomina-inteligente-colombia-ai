
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';

type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte' | 'superadmin';

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
  const { user, loading, hasRole, hasModuleAccess, isSuperAdmin, roles, hasOptimisticRole } = useAuth();

  console.log('🛡️ ProtectedRoute check:', {
    user: user?.email,
    loading,
    requiredRole,
    requiredModule,
    userRoles: roles,
    isSuperAdmin,
    hasOptimisticRole,
    hasRequiredRole: requiredRole ? hasRole(requiredRole, companyId) : 'no role required',
    hasModuleAccess: requiredModule ? hasModuleAccess(requiredModule) : 'no module required'
  });

  // Mostrar loading solo mientras se cargan los datos de auth iniciales
  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading auth...');
    return (
      <LoadingWithTimeout 
        message="Verificando autenticación..."
        timeout={7}
        redirectTo="/error"
      />
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // SuperAdmin tiene acceso a todo inmediatamente
  if (isSuperAdmin) {
    console.log('👑 ProtectedRoute: SuperAdmin access granted');
    return <>{children}</>;
  }

  // Si tiene roles (reales o optimistas), proceder con verificación de permisos
  const effectiveRoles = roles.length > 0 ? roles : [];
  
  // Verificar rol específico si se requiere
  if (requiredRole && !hasRole(requiredRole, companyId)) {
    console.log('❌ ProtectedRoute: User lacks required role:', requiredRole);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          <p className="text-xs text-gray-400 mt-2">
            Rol requerido: {requiredRole} | Tus roles: {effectiveRoles.map(r => r.role).join(', ') || 'ninguno'}
          </p>
        </div>
      </div>
    );
  }

  // Verificar acceso al módulo si se requiere
  if (requiredModule && !hasModuleAccess(requiredModule)) {
    console.log('❌ ProtectedRoute: User lacks module access:', requiredModule);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a este módulo.</p>
          <p className="text-xs text-gray-400 mt-2">
            Módulo requerido: {requiredModule} | Tus roles: {effectiveRoles.map(r => r.role).join(', ') || 'ninguno'}
          </p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted' + (hasOptimisticRole ? ' (with optimistic role)' : ''));
  return <>{children}</>;
};
