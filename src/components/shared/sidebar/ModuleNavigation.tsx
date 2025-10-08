import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  History,
  Calendar,
  PiggyBank,
  BarChart3, 
  Settings
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/modules/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Empleados', href: '/modules/employees', icon: Users, module: 'employees' },
  { name: 'Liquidar Nómina', href: '/modules/payroll', icon: Calculator, module: 'payroll' },
  { name: 'Historial de Nómina', href: '/modules/payroll-history', icon: History, module: 'payroll-history' },
  { name: 'Prestaciones Sociales', href: '/modules/prestaciones-sociales', icon: PiggyBank, module: 'prestaciones-sociales' },
  { name: 'Vacaciones y Ausencias', href: '/modules/vacations-absences', icon: Calendar, module: 'vacations-absences' },
  { name: 'Reportes', href: '/modules/reports', icon: BarChart3, module: 'reports' },
  { name: 'Configuración', href: '/modules/settings', icon: Settings, module: 'settings' },
];

interface ModuleNavigationProps {
  collapsed: boolean;
}

export const ModuleNavigation: React.FC<ModuleNavigationProps> = ({ collapsed }) => {
  const location = useLocation();
  const { hasModuleAccess, isSuperAdmin, roles, loading } = useAuth();

  const getFilteredNavigation = () => {
    const mandatoryItems = navigation.filter(i => i.module === 'dashboard');
    
    if (loading) {
      return mandatoryItems;
    }

    if (isSuperAdmin) {
      return navigation;
    }

    if (roles.length > 0 && hasModuleAccess) {
      return navigation.filter(item => 
        item.module === 'dashboard' || hasModuleAccess(item.module)
      );
    }

    return navigation.filter(item => 
      ['dashboard', 'employees', 'payroll-history', 'prestaciones-sociales', 'reports'].includes(item.module)
    );
  };

  const filteredNavigation = getFilteredNavigation();

  return (
    <div className="space-y-1">
      {filteredNavigation.map((item) => {
        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
        
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "group flex items-center px-3 py-2.5 text-sm font-normal rounded-lg transition-colors",
              "hover:bg-muted/30",
              isActive
                ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground",
              collapsed ? "justify-center" : "justify-start"
            )}
            title={collapsed ? item.name : undefined}
          >
            <div className={cn(
              "flex items-center justify-center transition-colors",
              collapsed ? "w-8 h-8" : "w-5 h-5 mr-3"
            )}>
              <item.icon className={cn("h-5 w-5 transition-colors", isActive && "text-primary")} />
            </div>
            
            {!collapsed && (
              <span className="truncate flex-1">
                {item.name}
              </span>
            )}
            
            {collapsed && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-border">
                {item.name}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-t border-border rotate-45"></div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
};
