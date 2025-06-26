
import { useState, useRef, useEffect } from 'react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Handle click outside sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !sidebarCollapsed &&
        window.innerWidth < 768 // Only on mobile
      ) {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div ref={sidebarRef}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>
      
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header />
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
