
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
  const { user, loading, hasRole, hasModuleAccess, isSuperAdmin, roles, profile } = useAuth();

  console.log('🛡️ ProtectedRoute check:', {
    user: user?.email,
    loading,
    requiredRole,
    requiredModule,
    userRoles: roles,
    profile: profile?.company_id,
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

  // Si hay usuario y perfil pero no hay roles, esperar más tiempo antes de denegar acceso
  if (user && profile?.company_id && roles.length === 0) {
    console.log('⏳ ProtectedRoute: User has company but roles still loading, waiting...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600">Configurando permisos...</p>
        </div>
      </div>
    );
  }

  // Si hay usuario pero no perfil ni roles, mostrar mensaje de configuración
  if (user && !profile && roles.length === 0) {
    console.log('⚠️ ProtectedRoute: User without profile or roles');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600">Configurando cuenta...</p>
        </div>
      </div>
    );
  }

  // Si hay perfil sin empresa, mostrar mensaje específico
  if (user && profile && !profile.company_id) {
    console.log('⚠️ ProtectedRoute: User profile without company');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración Pendiente</h1>
          <p className="text-gray-600">Su cuenta necesita ser asociada a una empresa.</p>
          <p className="text-sm text-gray-400 mt-2">Contacte soporte si necesita ayuda.</p>
        </div>
      </div>
    );
  }

  // Solo después de todas las verificaciones, check roles específicos
  if (roles.length === 0 && !isSuperAdmin) {
    console.log('❌ ProtectedRoute: No roles found after complete loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin Permisos</h1>
          <p className="text-gray-600">Su cuenta no tiene roles asignados.</p>
          <p className="text-sm text-gray-400 mt-2">Contacte su administrador o soporte.</p>
        </div>
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
