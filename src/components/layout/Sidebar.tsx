
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
  ChevronRight,
  Menu
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
      "bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 h-screen z-50 shadow-sm",
      "transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 min-h-[60px] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">NóminaApp</span>
          </div>
        )}
        
        <button
          onClick={onToggle}
          className={cn(
            "p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200",
            "flex items-center justify-center",
            collapsed ? "w-full" : "flex-shrink-0"
          )}
        >
          {collapsed ? (
            <Menu className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                "hover:bg-gray-50 active:scale-[0.98]",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                  : "text-gray-700 hover:text-gray-900",
                collapsed ? "justify-center" : "justify-start"
              )}
              title={collapsed ? item.name : undefined}
            >
              <div className={cn(
                "flex items-center justify-center rounded-md transition-colors duration-200",
                collapsed ? "w-8 h-8" : "w-6 h-6 mr-3",
                isActive 
                  ? "text-blue-600" 
                  : "text-gray-500 group-hover:text-gray-700"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              
              {!collapsed && (
                <span className="truncate font-medium">{item.name}</span>
              )}
              
              {/* Tooltip para sidebar colapsado */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  {item.name}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer con información adicional cuando está expandido */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-500 text-center">
            <span className="font-medium">NóminaApp</span>
            <div className="mt-1">Gestión de nómina</div>
          </div>
        </div>
      )}
    </div>
  );
};
