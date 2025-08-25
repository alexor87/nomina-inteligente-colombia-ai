
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRoles } from '@/contexts/RoleContext';
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
  PiggyBank
} from 'lucide-react';

const navigation = [
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
  const { hasModuleAccess, isSuperAdmin, loading } = useRoles();

  const getFilteredNavigation = () => {
    if (loading) {
      return [navigation[0]]; // Solo dashboard mientras carga
    }

    if (isSuperAdmin) {
      return navigation;
    }

    return navigation.filter(item => 
      item.module === 'dashboard' || hasModuleAccess(item.module)
    );
  };

  const filteredNavigation = getFilteredNavigation();

  return (
    <div className={cn(
      "bg-card border-r border-border flex flex-col fixed top-0 left-0 h-screen z-50",
      "transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border min-h-[60px] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src="/lovable-uploads/b727a0b1-b3cc-4682-a86d-29eb5e60af4a.png" 
                alt="Nómina Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-lg font-semibold text-foreground">Nómina</span>
          </div>
        )}
        
        <button
          onClick={onToggle}
          className={cn(
            "p-2 rounded-lg hover:bg-accent transition-colors duration-200",
            "flex items-center justify-center",
            collapsed ? "w-full" : "flex-shrink-0"
          )}
        >
          {collapsed ? (
            <Menu className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
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
                "hover:bg-accent active:scale-[0.98]",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
                collapsed ? "justify-center" : "justify-start"
              )}
              title={collapsed ? item.name : undefined}
            >
              <div className={cn(
                "flex items-center justify-center transition-colors duration-200",
                collapsed ? "w-8 h-8" : "w-6 h-6 mr-3"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              
              {!collapsed && (
                <span className="truncate font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground text-center">
            <span className="font-medium">Finppi</span>
            <div className="mt-1">Gestión de nómina</div>
          </div>
        </div>
      )}
    </div>
  );
};
