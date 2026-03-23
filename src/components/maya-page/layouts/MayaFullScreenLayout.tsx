import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { MayaProvider } from '@/maya/MayaProvider';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';
import { MayaBackground } from '../MayaBackground';
import { UnifiedSidebar } from '@/components/shared/UnifiedSidebar';
import { DynamicHeader } from '@/components/shared/DynamicHeader';
import { MayaFloatingAssistant } from '@/maya/MayaFloatingAssistant';
import { MayaGlobalManager } from '@/maya/MayaGlobalManager';
import { FEATURES } from '@/config/features';

export const MayaFullScreenLayout: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <LoadingWithTimeout
        message="Verificando autenticación..."
        timeout={7}
        redirectTo="/login"
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Usuario autenticado sin empresa → completar registro
  if (!profile?.company_id) {
    return <Navigate to="/register/company" replace />;
  }

  const layout = (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <MayaBackground />

      {/* Sidebar unificado (MAYA + Módulos) */}
      <UnifiedSidebar />

      {/* Área principal (derecha) */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <DynamicHeader />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>

      {/* Componentes MAYA Globales */}
      {FEATURES.MAYA_ENABLED && <MayaFloatingAssistant />}
      {FEATURES.MAYA_ENABLED && <MayaGlobalManager />}
    </div>
  );

  if (!FEATURES.MAYA_ENABLED) {
    return layout;
  }

  return (
    <MayaProvider autoShow={location.pathname === '/maya'}>
      {layout}
    </MayaProvider>
  );
};
