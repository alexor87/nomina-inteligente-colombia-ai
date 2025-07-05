
import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import Header from './Header';

export const Layout = () => {
  const { roles } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/30 flex">
      <div ref={sidebarRef}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>
      
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header />
        
        <main className="flex-1 p-6 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Overlay para móvil cuando sidebar está abierto */}
      {!sidebarCollapsed && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};
