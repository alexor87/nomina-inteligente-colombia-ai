
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { loading } = useAuth();

  console.log('🏗️ Layout rendered with sidebar collapsed:', sidebarCollapsed);

  if (loading) {
    return (
      <LoadingWithTimeout 
        message="Cargando aplicación..."
        timeout={10}
        redirectTo="/login"
      />
    );
  }

  return (
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
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
