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

  // If no user, redirect to auth (this is the only redirect we keep)
  if (!user) {
    console.log('🚫 ProtectedRoute: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Validate access silently in background
  const hasValidAccess = () => {
    // Super admin requirement check
    if (requireSuperAdmin && !isSaasAdmin) {
      console.log('❌ ProtectedRoute: User is not super admin');
      return false;
    }

    // Module access check
    if (module && !canAccessModule(module)) {
      console.log('❌ ProtectedRoute: User cannot access module:', module);
      return false;
    }

    // Role requirement check (if not super admin)
    if (requiredRole && !isSaasAdmin && !hasRole(requiredRole)) {
      console.log('❌ ProtectedRoute: User lacks required role:', requiredRole);
      return false;
    }

    return true;
  };

  // If access validation fails, show loading while we handle it in background
  if (!hasValidAccess()) {
    console.log('⏳ ProtectedRoute: Access validation in progress...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600 text-lg">Validando acceso...</p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
