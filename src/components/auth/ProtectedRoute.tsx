
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600 text-lg">Verificando acceso...</p>
          <p className="text-gray-400 text-sm mt-2">Cargando información de usuario</p>
        </div>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">Necesitas permisos de Super Administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  // Check module access
  if (module && !canAccessModule(module)) {
    console.log('❌ ProtectedRoute: User cannot access module:', module);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h1>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a este módulo.</p>
          <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
            <p><strong>Módulo:</strong> {module}</p>
            <p><strong>Usuario:</strong> {user.email}</p>
            <p><strong>Super Admin:</strong> {isSaasAdmin ? 'Sí' : 'No'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Check specific role requirement (if not super admin)
  if (requiredRole && !isSaasAdmin && !hasRole(requiredRole)) {
    console.log('❌ ProtectedRoute: User lacks required role:', requiredRole);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Permisos Insuficientes</h1>
          <p className="text-gray-600 mb-4">Tu rol actual no permite acceder a esta funcionalidad.</p>
          <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
            <p><strong>Rol requerido:</strong> {requiredRole}</p>
            <p><strong>Usuario:</strong> {user.email}</p>
            <p><strong>Super Admin:</strong> {isSaasAdmin ? 'Sí' : 'No'}</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
