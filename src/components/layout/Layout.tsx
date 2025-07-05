
import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Header from './Header';

export const Layout = () => {
  const { roles } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <SidebarInset>
          <div className="flex flex-col min-h-screen">
            <header className="h-16 flex items-center justify-between px-6 border-b bg-white">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">Sistema de Nómina</h1>
              </div>
              <Header />
            </header>
            
            <main className="flex-1 p-6 bg-gray-50/30">
              <div className="max-w-7xl mx-auto">
                <Outlet />
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
