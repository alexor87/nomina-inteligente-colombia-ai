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

export const MayaFullScreenLayout: React.FC = () => {
  const { user, loading } = useAuth();
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

  return (
    <MayaProvider autoShow={location.pathname === '/maya'}>
      <div className="flex h-screen w-full bg-white overflow-hidden">
        <MayaBackground />
        
        {/* Sidebar unificado (MAYA + Módulos) */}
        <UnifiedSidebar />
        
        {/* Área principal (derecha) */}
        <div className="flex-1 flex flex-col relative z-10">
          <DynamicHeader />
          <Outlet />
        </div>
        
        {/* Componentes MAYA Globales */}
        <MayaFloatingAssistant />
        <MayaGlobalManager />
      </div>
    </MayaProvider>
  );
};
