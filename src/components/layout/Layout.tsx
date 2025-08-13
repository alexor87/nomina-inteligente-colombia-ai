
import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();

  console.log('🏗️ Layout rendered with sidebar collapsed:', sidebarCollapsed, 'user:', user?.email);

  // Constants for consistent spacing
  const SIDEBAR_WIDTH_COLLAPSED = 64; // 16 * 4px
  const SIDEBAR_WIDTH_EXPANDED = 256; // 64 * 4px
  const GAP = 24; // Increased from 16 to 24 for more spacing from sidebar

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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main 
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: `${sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED + GAP : SIDEBAR_WIDTH_EXPANDED + GAP}px`
        }}
      >
        <Header />
        <div className="min-h-screen bg-gray-50 pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
