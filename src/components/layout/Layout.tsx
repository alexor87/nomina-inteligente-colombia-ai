
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: 'admin' | 'company' | 'employee';
  user?: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
}

export const Layout = ({ children }: LayoutProps) => {
  const { roles } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determinar el rol del usuario para el sidebar
  const getUserRole = () => {
    if (roles.some(r => r.role === 'administrador')) return 'company';
    if (roles.some(r => r.role === 'soporte')) return 'admin';
    return 'company'; // Por defecto
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        userRole={getUserRole()}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
