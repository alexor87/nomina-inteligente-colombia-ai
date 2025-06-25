
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
