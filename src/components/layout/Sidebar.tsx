
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AutoRoleAssignmentService } from '@/services/AutoRoleAssignmentService';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  FileText, 
  BarChart3, 
  Settings,
  History,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Menu,
  Calendar,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Empleados', href: '/app/employees', icon: Users, module: 'employees' },
  { name: 'Liquidar Nómina', href: '/app/payroll', icon: Calculator, module: 'payroll' },
  { name: 'Historial de Nómina', href: '/app/payroll-history', icon: History, module: 'payroll-history' },
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
  const { hasModuleAccess, isSuperAdmin, roles, loading, refreshUserData } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  console.log('🧭 Sidebar Debug:', {
    currentPath: location.pathname,
    collapsed,
    loading,
    isSuperAdmin,
    rolesCount: roles.length,
    hasModuleAccessFunction: !!hasModuleAccess
  });

  // Función para intentar recuperar acceso
  const handleRetryAccess = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    console.log('🔄 Intentando recuperar acceso...');
    
    try {
      // 1. Intentar auto-asignación de rol
      await AutoRoleAssignmentService.attemptAutoAdminAssignment();
      
      // 2. Refrescar datos del usuario
      await refreshUserData();
      
      console.log('✅ Reintento completado');
    } catch (error) {
      console.error('❌ Error en reintento:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Mostrar elementos básicos mientras carga
  const getFilteredNavigation = () => {
    if (loading) {
      // Mientras carga, mostrar solo dashboard
      return [navigation[0]];
    }

    // SuperAdmin ve todo
    if (isSuperAdmin) {
      return navigation;
    }

    // Si no hay función de acceso o no hay roles, mostrar navegación mínima
    if (!hasModuleAccess || roles.length === 0) {
      return navigation.filter(item => ['dashboard', 'employees'].includes(item.module));
    }

    // Filtrar por acceso a módulos
    return navigation.filter(item => hasModuleAccess(item.module));
  };

  const filteredNavigation = getFilteredNavigation();
  const hasNoRoles = !loading && roles.length === 0 && !isSuperAdmin;

  console.log('🔍 Filtered Navigation:', {
    totalFiltered: filteredNavigation.length,
    hasNoRoles,
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
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src="/lovable-uploads/b727a0b1-b3cc-4682-a86d-29eb5e60af4a.png" 
                alt="Nómina Logo" 
                className="w-full h-full object-contain"
              />
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

      {/* Alerta de "Sin acceso a módulos" */}
      {hasNoRoles && !collapsed && (
        <div className="mx-3 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-800">
                Sin acceso a módulos
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Configurando permisos...
              </p>
              <button
                onClick={handleRetryAccess}
                disabled={isRetrying}
                className="mt-2 inline-flex items-center space-x-1 text-xs text-amber-800 hover:text-amber-900 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
                <span>{isRetrying ? 'Reintentando...' : 'Reintentar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.length > 0 ? (
          filteredNavigation.map((item) => {
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
          })
        ) : (
          // Fallback cuando no hay navegación disponible
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">
              {loading ? 'Cargando menú...' : 'Configurando acceso...'}
            </div>
          </div>
        )}
      </nav>

      {/* Footer con información adicional cuando está expandido */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-500 text-center">
            <span className="font-medium">Finppi</span>
            <div className="mt-1">Gestión de nómina</div>
          </div>
        </div>
      )}
    </div>
  );
};
