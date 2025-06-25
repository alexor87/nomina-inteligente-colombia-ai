
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  CreditCard, 
  FileText, 
  BarChart3, 
  Settings,
  Building2,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ collapsed = false, onToggle }: SidebarProps) => {
  const { canAccessModule, isSuperAdmin } = useAuth();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      module: 'dashboard'
    },
    {
      name: 'Empleados',
      href: '/employees',
      icon: Users,
      module: 'empleados'
    },
    {
      name: 'Nómina',
      href: '/payroll-backend',
      icon: Calculator,
      module: 'nomina'
    },
    {
      name: 'Pagos',
      href: '/payments',
      icon: CreditCard,
      module: 'pagos'
    },
    {
      name: 'Comprobantes',
      href: '/vouchers',
      icon: FileText,
      module: 'comprobantes'
    },
    {
      name: 'Reportes',
      href: '/reports',
      icon: BarChart3,
      module: 'reportes'
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      module: 'configuracion'
    }
  ];

  // Add super admin item ONLY if user is superadmin
  if (isSuperAdmin) {
    navigationItems.push({
      name: 'Super Admin',
      href: '/super-admin',
      icon: Building2,
      module: 'super-admin'
    });
    
    navigationItems.push({
      name: 'Backoffice',
      href: '/backoffice',
      icon: Shield,
      module: 'backoffice'
    });
  }

  return (
    <div className={`
      h-full bg-white border-r border-gray-200 shadow-sm
      ${collapsed ? 'w-16' : 'w-64'}
      transition-all duration-300 ease-in-out
      flex flex-col
    `}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">Nómina</span>
            {isSuperAdmin && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                SuperAdmin
              </span>
            )}
          </div>
        )}
        
        {/* Toggle button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={`
            p-1.5 h-8 w-8
            ${collapsed ? 'mx-auto' : 'md:hidden'}
          `}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            // Check if user can access this module
            const hasAccess = canAccessModule(item.module);
            
            if (!hasAccess) {
              return null;
            }

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center rounded-lg transition-all duration-200 group relative
                   ${collapsed ? 'p-2 justify-center' : 'px-3 py-2'}
                   ${isActive 
                     ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                     : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                   }`
                }
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={`
                  h-5 w-5 flex-shrink-0
                  ${collapsed ? '' : 'mr-3'}
                `} />
                
                {!collapsed && (
                  <span className="text-sm font-medium truncate">
                    {item.name}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200">
        {!collapsed && (
          <div className="text-xs text-gray-500 text-center">
            v1.0.0
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
