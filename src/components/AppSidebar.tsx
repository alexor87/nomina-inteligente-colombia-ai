
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  Calculator,
  History,
  FileBarChart,
  Settings,
  Building2
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from '@/contexts/AuthContext';

// NAVEGACIÓN SIEMPRE DISPONIBLE - Fallback crítico
const CORE_NAVIGATION = [
  {
    title: "Dashboard",
    url: "/app/dashboard",
    icon: Home,
    module: "dashboard",
  },
  {
    title: "Empleados",
    url: "/app/employees",
    icon: Users,
    module: "employees",
  },
  {
    title: "Nómina",
    url: "/app/payroll",
    icon: Calculator,
    module: "payroll",
  },
  {
    title: "Historial",
    url: "/app/payroll-history",
    icon: History,
    module: "payroll-history",
  },
  {
    title: "Reportes",
    url: "/app/reports",
    icon: FileBarChart,
    module: "reports",
  },
  {
    title: "Configuración",
    url: "/app/settings",
    icon: Settings,
    module: "settings",
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { hasModuleAccess, user, loading } = useAuth();
  
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  // LÓGICA DE FILTRADO ROBUSTA
  const getVisibleNavigation = () => {
    // Si está cargando, mostrar navegación básica
    if (loading) {
      console.log('🔄 Loading state, showing basic navigation');
      return CORE_NAVIGATION;
    }

    // Si no hay usuario, no mostrar nada
    if (!user) {
      console.log('❌ No user, hiding navigation');
      return [];
    }

    // Si no hay función de verificación de acceso, mostrar todo
    if (!hasModuleAccess) {
      console.log('⚠️ No hasModuleAccess function, showing all');
      return CORE_NAVIGATION;
    }

    try {
      // Filtrar por permisos
      const filtered = CORE_NAVIGATION.filter(item => hasModuleAccess(item.module));
      
      // FALLBACK CRÍTICO: Si el filtrado deja el sidebar vacío, mostrar navegación básica
      if (filtered.length === 0) {
        console.warn('⚠️ No navigation items after filtering, showing fallback');
        return CORE_NAVIGATION;
      }
      
      console.log('✅ Navigation filtered:', filtered.length, 'items');
      return filtered;
    } catch (error) {
      console.error('❌ Error filtering navigation:', error);
      // En caso de error, mostrar navegación completa
      return CORE_NAVIGATION;
    }
  };

  const navigationItems = getVisibleNavigation();

  const isActive = (path: string) => currentPath === path;
  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b px-6 py-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sistema Nómina</h2>
              <p className="text-xs text-muted-foreground">Gestión Empresarial</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {loading ? 'Cargando menú...' : 'Inicia sesión para ver el menú'}
                  </div>
                </SidebarMenuItem>
              ) : (
                navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={getNavClassName}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer con estado del usuario */}
      {!isCollapsed && (
        <div className="mt-auto px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-500 text-center">
            <span className="font-medium">Sistema Restaurado ✅</span>
            <div className="mt-1">
              {user ? `${user.email}` : 'No autenticado'}
            </div>
            {loading && (
              <div className="mt-1 text-blue-500">Cargando permisos...</div>
            )}
          </div>
        </div>
      )}
    </Sidebar>
  );
}
