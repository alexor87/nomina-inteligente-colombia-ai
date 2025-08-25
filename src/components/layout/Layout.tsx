
import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { AppLoading } from '@/components/ui/AppLoading';

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();

  console.log('🏗️ Layout render - User:', user?.email, 'Loading:', loading);

  if (loading) {
    return <AppLoading message="Verificando autenticación..." />;
  }

  if (!user) {
    console.log('🚫 No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return (
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
        <div className="min-h-screen bg-background">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
