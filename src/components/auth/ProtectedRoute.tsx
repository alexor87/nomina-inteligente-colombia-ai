
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'editor' | 'lector';
  requireSuperAdmin?: boolean;
  module?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requireSuperAdmin = false,
  module
}) => {
  const { user, loading, hasRole, isSuperAdmin, canAccessModule, currentCompany } = useAuth();

  console.log('🛡️ ProtectedRoute check:', {
    user: user?.email,
    loading,
    requiredRole,
    requireSuperAdmin,
    module,
    isSuperAdmin,
    currentCompany,
    hasRequiredRole: requiredRole ? hasRole(requiredRole) : 'no role required',
    canAccessModule: module ? canAccessModule(module) : 'no module check'
  });

  // Show loading while authentication is being verified
  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600 text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to auth
  if (!user) {
    console.log('🚫 ProtectedRoute: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Validate access
  const hasValidAccess = () => {
    // Super admin requirement check
    if (requireSuperAdmin && !isSuperAdmin) {
      console.log('❌ ProtectedRoute: User is not super admin');
      return false;
    }

    // If requires superadmin and user is superadmin, allow access
    if (requireSuperAdmin && isSuperAdmin) {
      console.log('✅ ProtectedRoute: SuperAdmin access granted');
      return true;
    }

    // Module access check
    if (module && !canAccessModule(module)) {
      console.log('❌ ProtectedRoute: User cannot access module:', module);
      return false;
    }

    // Role requirement check
    if (requiredRole && !hasRole(requiredRole)) {
      console.log('❌ ProtectedRoute: User lacks required role:', requiredRole);
      return false;
    }

    // For non-superadmin users, check if they have a current company
    if (!isSuperAdmin && !currentCompany) {
      console.log('❌ ProtectedRoute: Non-superadmin user has no current company');
      return false;
    }

    return true;
  };

  // If access validation fails, show access denied
  if (!hasValidAccess()) {
    console.log('❌ ProtectedRoute: Access denied');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-sm text-gray-500">
            {!currentCompany && !isSuperAdmin ? 
              'No tienes una empresa asignada. Contacta al administrador.' :
              'Contacta al administrador para obtener los permisos necesarios.'
            }
          </p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
