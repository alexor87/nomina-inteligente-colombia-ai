
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  CreditCard, 
  FileText, 
  BarChart3, 
  Settings,
  History,
  Receipt,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Empleados', href: '/employees', icon: Users, module: 'employees' },
  { name: 'Liquidar Nómina', href: '/payroll-backend', icon: Calculator, module: 'payroll' },
  { name: 'Historial Nómina', href: '/payroll-history', icon: History, module: 'payroll-history' },
  { name: 'Comprobantes', href: '/vouchers', icon: Receipt, module: 'vouchers' },
  { name: 'Pagos y Dispersión', href: '/payments', icon: CreditCard, module: 'payments' },
  { name: 'Reportes', href: '/reports', icon: BarChart3, module: 'reports' },
  { name: 'Configuración', href: '/settings', icon: Settings, module: 'settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const { hasModuleAccess, isSuperAdmin } = useAuth();

  // Filtrar navegación basada en permisos
  const filteredNavigation = navigation.filter(item => {
    if (isSuperAdmin) return true;
    return hasModuleAccess(item.module);
  });

  console.log('🧭 Sidebar navigation filtered:', {
    isSuperAdmin,
    totalItems: navigation.length,
    filteredItems: filteredNavigation.length,
    filteredNavigation: filteredNavigation.map(n => n.name)
  });

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 min-h-[64px]">
        {!collapsed && (
          <>
            <div className="flex items-center space-x-2">
              <Calculator className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <span className="text-xl font-bold text-gray-900 truncate">NóminaApp</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-gray-100 flex-shrink-0 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-full">
            <Calculator className="h-8 w-8 text-blue-600" />
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group relative",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0", 
                !collapsed && "mr-3"
              )} />
              {!collapsed && (
                <span className="truncate">{item.name}</span>
              )}
              
              {/* Tooltip para cuando está colapsado */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
