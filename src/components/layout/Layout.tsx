
import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';
import { MayaProvider } from '@/maya/MayaProvider';
import { MayaFloatingAssistant } from '@/maya/MayaFloatingAssistant';
import { MayaGlobalManager } from '@/maya/MayaGlobalManager';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { TrialExpiredBanner } from '@/components/subscription/TrialExpiredBanner';

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const { isTrialExpired } = useSubscription();

  console.log('🏗️ Layout rendered with sidebar collapsed:', sidebarCollapsed, 'user:', user?.id?.slice(0, 8));

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <LoadingWithTimeout 
        message="Verificando autenticación..."
        timeout={7}
        redirectTo="/login"
      />
    );
  }

  // Redirigir a login si no hay usuario autenticado
  if (!user) {
    console.log('🚫 Layout: No authenticated user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return (
    <MayaProvider autoShow={false}>
      <div className="flex min-h-screen bg-background">
        <Sidebar 
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main 
          className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          <Header />
          {isTrialExpired && <TrialExpiredBanner />}
          <div className="min-h-screen bg-background">
            <Outlet />
          </div>
        </main>
        
        {/* MAYA Global Components */}
        <MayaFloatingAssistant />
        <MayaGlobalManager />
      </div>
    </MayaProvider>
  );
};
