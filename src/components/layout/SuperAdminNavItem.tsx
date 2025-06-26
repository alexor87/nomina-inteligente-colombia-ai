
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const SuperAdminNavItem = () => {
  const { isSuperAdmin } = useAuth();
  const location = useLocation();

  if (!isSuperAdmin) return null;

  const isActive = location.pathname === '/super-admin';

  return (
    <Link
      to="/super-admin"
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Shield className="mr-3 h-4 w-4" />
      Super Admin
    </Link>
  );
};
