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
  Settings,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Navigation items ordered by priority: work modules first, tools/settings last
const navigation = [
  { name: 'Dashboard', href: '/modules/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Empleados', href: '/modules/employees', icon: Users, module: 'employees' },
  { name: 'Liquidar Nómina', href: '/modules/payroll', icon: Calculator, module: 'payroll' },
  { name: 'Historial de Nómina', href: '/modules/payroll-history', icon: History, module: 'payroll-history' },
  { name: 'Prestaciones Sociales', href: '/modules/prestaciones-sociales', icon: PiggyBank, module: 'prestaciones-sociales' },
  { name: 'Vacaciones y Ausencias', href: '/modules/vacations-absences', icon: Calendar, module: 'vacations-absences' },
  { name: 'Reportes', href: '/modules/reports', icon: BarChart3, module: 'reports' },
];

// Secondary navigation items (tools and settings)
const secondaryNavigation = [
  { name: 'MAYA', href: '/maya', icon: Sparkles, module: 'maya', badge: 'IA' },
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

  const renderNavItem = (item: typeof navigation[0] & { badge?: string }) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    const hasBadge = 'badge' in item && item.badge;
    
    return (
      <Link
        key={item.name}
        to={item.href}
        className={cn(
          "group flex items-center px-3 py-2.5 text-sm font-normal rounded-lg transition-colors relative",
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
        
        {!collapsed && hasBadge && (
          <Badge 
            variant="secondary" 
            className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border-0"
          >
            {item.badge}
          </Badge>
        )}
        
        {collapsed && hasBadge && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-primary">IA</span>
          </div>
        )}
        
        {collapsed && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-border">
            {item.name}
            {hasBadge && <span className="ml-1 text-primary">({item.badge})</span>}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-t border-border rotate-45"></div>
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Primary navigation - work modules */}
      <div className="space-y-1 flex-1">
        {filteredNavigation.map(renderNavItem)}
      </div>
      
      {/* Divider */}
      <div className={cn("my-3", collapsed ? "mx-2" : "mx-0")}>
        <div className="h-px bg-border" />
      </div>
      
      {/* Secondary navigation - tools & settings */}
      <div className="space-y-1">
        {secondaryNavigation.map(renderNavItem)}
      </div>
    </div>
  );
};
