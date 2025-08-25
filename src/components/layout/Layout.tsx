
import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';
import { VoiceAgentProvider } from '@/contexts/VoiceAgentContext';

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();

  console.log('🏗️ Layout rendered with sidebar collapsed:', sidebarCollapsed, 'user:', user?.email);

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
    <VoiceAgentProvider>
      <div className="flex min-h-screen bg-gray-50">
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
          <div className="min-h-screen bg-gray-50">
            <Outlet />
          </div>
        </main>

        {/* Floating Voice Agent - Temporarily disabled to fix forwardRef error
        <FloatingVoiceAgent />
        */}
      </div>
    </VoiceAgentProvider>
  );
};
