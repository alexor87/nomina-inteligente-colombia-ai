
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  FileText, 
  BarChart3, 
  Settings,
  History,
  ChevronLeft,
  Menu,
  Calendar,
  PiggyBank,
  Building2,
  Brain,
  Sparkles
} from 'lucide-react';

const navigation = [
  { name: 'MAYA', href: '/app/maya', icon: Brain, module: 'maya', badge: 'IA', animated: true },
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Empleados', href: '/app/employees', icon: Users, module: 'employees' },
  { name: 'Liquidar Nómina', href: '/app/payroll', icon: Calculator, module: 'payroll' },
  { name: 'Historial de Nómina', href: '/app/payroll-history', icon: History, module: 'payroll-history' },
  { name: 'Prestaciones Sociales', href: '/app/prestaciones-sociales', icon: PiggyBank, module: 'prestaciones-sociales' },
  { name: 'Vacaciones y Ausencias', href: '/app/vacations-absences', icon: Calendar, module: 'vacations-absences' },
  { name: 'Reportes', href: '/app/reports', icon: BarChart3, module: 'reports' },
  { name: 'Configuración', href: '/app/settings', icon: Settings, module: 'settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const { hasModuleAccess, isSuperAdmin, roles, loading } = useAuth();

  console.log('🧭 Sidebar Debug:', {
    currentPath: location.pathname,
    collapsed,
    loading,
    isSuperAdmin,
    rolesCount: roles.length,
    hasModuleAccessFunction: !!hasModuleAccess
  });

  // Lógica simplificada de navegación - siempre mostrar módulos básicos
  const getFilteredNavigation = () => {
    // Siempre mostrar MAYA y Dashboard
    const mandatoryItems = navigation.filter(i => i.module === 'maya' || i.module === 'dashboard');
    
    // Si está cargando auth, mostrar solo obligatorios
    if (loading) {
      return mandatoryItems;
    }

    // SuperAdmin ve todo
    if (isSuperAdmin) {
      return navigation;
    }

    // Si tiene roles, filtrar por acceso a módulos (mantener obligatorios)
    if (roles.length > 0 && hasModuleAccess) {
      return navigation.filter(item => 
        item.module === 'maya' || item.module === 'dashboard' || hasModuleAccess(item.module)
      );
    }

    // Por defecto, mostrar módulos esenciales (incluye rol optimista)
    return navigation.filter(item => 
      ['maya', 'dashboard', 'employees', 'payroll-history', 'prestaciones-sociales', 'reports'].includes(item.module)
    );
  };

  const filteredNavigation = getFilteredNavigation();

  console.log('🔍 Filtered Navigation:', {
    totalFiltered: filteredNavigation.length,
    items: filteredNavigation.map(n => ({ name: n.name, module: n.module }))
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
            <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Nómina</span>
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
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative",
                "hover:bg-gray-50 active:scale-[0.98]",
                isActive && item.module === 'maya'
                  ? "bg-gradient-to-r from-purple-600/15 via-pink-600/10 to-purple-600/15 text-white border border-purple-500/20 shadow-lg shadow-purple-500/10"
                  : isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                  : "text-gray-700 hover:text-gray-900",
                collapsed ? "justify-center" : "justify-start",
                item.module === 'maya' && "overflow-hidden"
              )}
              title={collapsed ? item.name : undefined}
            >
              {/* Special effects for MAYA - only when active */}
              {item.module === 'maya' && (
                <>
                  {/* Light beam effect on left edge when active */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-pink-500 to-purple-500" />
                  )}
                  
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Sparkles */}
                  {!collapsed && !isActive && (
                    <Sparkles className="absolute right-2 top-2 h-3 w-3 text-purple-500/60 animate-pulse" />
                  )}
                </>
              )}
              
              <div className={cn(
                "flex items-center justify-center rounded-md transition-all duration-200 relative",
                collapsed ? "w-8 h-8" : "w-6 h-6 mr-3",
                item.module === 'maya' 
                  ? "text-purple-400"
                  : isActive 
                    ? "text-blue-600" 
                    : "text-gray-500 group-hover:text-gray-700",
                item.module === 'maya' && item.animated && "animate-pulse"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              
              {!collapsed && (
                <span className={cn(
                  "truncate font-medium flex-1",
                  item.module === 'maya' && "bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
                )}>
                  {item.name}
                </span>
              )}
              
              {/* Badge for MAYA */}
              {!collapsed && item.badge && (
                <span className="relative ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 overflow-hidden">
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{
                    animation: 'shimmer 2s infinite',
                    backgroundSize: '200% 100%'
                  }} />
                  <span className="relative">{item.badge}</span>
                </span>
              )}
              
              {/* Badge indicator for collapsed */}
              {collapsed && item.badge && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full">
                  <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping" />
                </div>
              )}
              
              {/* Tooltip for collapsed sidebar */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  {item.name}
                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                      {item.badge}
                    </span>
                  )}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-500 text-center">
            <span className="font-medium">Nómina</span>
            <div className="mt-1">Gestión de nómina</div>
          </div>
        </div>
      )}
    </div>
  );
};
