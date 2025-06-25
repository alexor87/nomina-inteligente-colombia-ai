
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';
  requireSuperAdmin?: boolean;
  module?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requireSuperAdmin = false,
  module
}) => {
  const { user, loading, hasRole, isSaasAdmin, canAccessModule } = useAuth();

  console.log('🛡️ ProtectedRoute check:', {
    user: user?.email,
    loading,
    requiredRole,
    requireSuperAdmin,
    module,
    isSaasAdmin,
    hasRequiredRole: requiredRole ? hasRole(requiredRole) : 'no role required',
    canAccessModule: module ? canAccessModule(module) : 'no module check'
  });

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

  // Check super admin requirement
  if (requireSuperAdmin && !isSaasAdmin) {
    console.log('❌ ProtectedRoute: User is not super admin');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">Necesitas permisos de Super Administrador.</p>
        </div>
      </div>
    );
  }

  // Check module access
  if (module && !canAccessModule(module)) {
    console.log('❌ ProtectedRoute: User cannot access module:', module);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a este módulo.</p>
          <p className="text-xs text-gray-400 mt-2">
            Módulo: {module} | Super Admin: {isSaasAdmin ? 'Sí' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  // Check specific role requirement (if not super admin)
  if (requiredRole && !isSaasAdmin && !hasRole(requiredRole)) {
    console.log('❌ ProtectedRoute: User lacks required role:', requiredRole);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          <p className="text-xs text-gray-400 mt-2">
            Rol requerido: {requiredRole} | Super Admin: {isSaasAdmin ? 'Sí' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
