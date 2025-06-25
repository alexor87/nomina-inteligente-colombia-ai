
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  CreditCard, 
  FileText, 
  BarChart3, 
  Settings,
  Building2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = () => {
  const { canAccessModule, isSaasAdmin } = useAuth();

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
      module: 'employees'
    },
    {
      name: 'Nómina',
      href: '/payroll-backend',
      icon: Calculator,
      module: 'payroll'
    },
    {
      name: 'Pagos',
      href: '/payments',
      icon: CreditCard,
      module: 'payments'
    },
    {
      name: 'Comprobantes',
      href: '/vouchers',
      icon: FileText,
      module: 'vouchers'
    },
    {
      name: 'Reportes',
      href: '/reports',
      icon: BarChart3,
      module: 'reports'
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      module: 'settings'
    }
  ];

  // Add super admin item if user is super admin
  if (isSaasAdmin) {
    navigationItems.push({
      name: 'Super Admin',
      href: '/super-admin',
      icon: Building2,
      module: 'super-admin'
    });
  }

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navigationItems.map((item) => {
              // Check if user can access this module
              if (!canAccessModule(item.module)) {
                return null;
              }

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                      isActive ? 'bg-muted text-primary' : ''
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
