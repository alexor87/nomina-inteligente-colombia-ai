
import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Header from './Header';

export const Layout = () => {
  const { loading } = useAuth();

  // Mostrar loading mientras se cargan los datos de autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50/30 flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white border-b border-gray-100">
            <div className="flex items-center justify-between px-6 py-3">
              <SidebarTrigger className="md:hidden" />
              <Header />
            </div>
          </div>
          
          <main className="flex-1 p-6 bg-white/50">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
