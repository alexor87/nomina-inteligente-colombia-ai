
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
  const { user, loading, hasRole, hasModuleAccess, isSuperAdmin, roles } = useAuth();

  console.log('🛡️ ProtectedRoute check:', {
    user: user?.email,
    loading,
    requiredRole,
    requiredModule,
    userRoles: roles,
    isSuperAdmin,
    hasRequiredRole: requiredRole ? hasRole(requiredRole, companyId) : 'no role required',
    hasModuleAccess: requiredModule ? hasModuleAccess(requiredModule) : 'no module required'
  });

  // SIEMPRE mostrar loading mientras se cargan los datos
  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // SuperAdmin tiene acceso a todo - NO necesita verificación adicional
  if (isSuperAdmin) {
    console.log('👑 ProtectedRoute: SuperAdmin access granted');
    return <>{children}</>;
  }

  // Si hay roles pero no se han cargado completamente, mostrar loading un poco más
  if (user && roles.length === 0 && !isSuperAdmin) {
    console.log('⏳ ProtectedRoute: Waiting for roles to load...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Verificar rol específico si se requiere
  if (requiredRole && !hasRole(requiredRole, companyId)) {
    console.log('❌ ProtectedRoute: User lacks required role:', requiredRole);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          <p className="text-xs text-gray-400 mt-2">
            Rol requerido: {requiredRole} | Tus roles: {roles.map(r => r.role).join(', ') || 'ninguno'}
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
            Módulo requerido: {requiredModule} | Tus roles: {roles.map(r => r.role).join(', ') || 'ninguno'}
          </p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
