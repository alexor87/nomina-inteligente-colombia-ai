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
        const isActive = location.pathname === item.href;
        
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              "hover:bg-muted/40 active:scale-[0.98]",
              isActive
                ? "bg-primary/5 text-primary border-l-2 border-primary"
                : "text-foreground/70 hover:text-foreground border-l-2 border-transparent",
              collapsed ? "justify-center" : "justify-start"
            )}
            title={collapsed ? item.name : undefined}
          >
            <div className={cn(
              "flex items-center justify-center transition-colors",
              collapsed ? "w-7 h-7" : "w-4 h-4 mr-2",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground group-hover:text-foreground"
            )}>
              <item.icon className="h-4 w-4" />
            </div>
            
            {!collapsed && (
              <span className="truncate flex-1">
                {item.name}
              </span>
            )}
            
            {collapsed && (
              <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-border">
                {item.name}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-popover border-l border-t border-border rotate-45"></div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
};
