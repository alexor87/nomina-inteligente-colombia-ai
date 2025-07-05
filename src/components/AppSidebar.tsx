
import { useState } from "react";
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

// Items básicos de navegación - siempre visibles para evitar pantalla vacía
const basicNavigationItems = [
  {
    title: "Dashboard",
    url: "/app/dashboard",
    icon: Home,
  },
  {
    title: "Empleados",
    url: "/app/employees",
    icon: Users,
  },
  {
    title: "Nómina",
    url: "/app/payroll",
    icon: Calculator,
  },
  {
    title: "Historial",
    url: "/app/payroll-history",
    icon: History,
  },
  {
    title: "Reportes",
    url: "/app/reports",
    icon: FileBarChart,
  },
  {
    title: "Configuración",
    url: "/app/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { hasModuleAccess, user, loading } = useAuth();
  
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  // Filtrar navegación - con fallback para evitar sidebar vacío
  const getFilteredNavigation = () => {
    // Si no hay usuario o está cargando, mostrar items básicos
    if (!user || loading) {
      return basicNavigationItems;
    }

    // Si hay función de verificación de acceso, usarla
    if (hasModuleAccess) {
      try {
        const filtered = basicNavigationItems.filter(item => {
          // Extraer el módulo de la URL (ej: /app/dashboard -> dashboard)
          const module = item.url.split('/').pop() || '';
          return hasModuleAccess(module);
        });
        
        // Si el filtrado deja el sidebar vacío, mostrar todo
        return filtered.length > 0 ? filtered : basicNavigationItems;
      } catch (error) {
        console.error('Error filtering navigation:', error);
        // En caso de error, mostrar navegación básica
        return basicNavigationItems;
      }
    }

    // Fallback: mostrar todo
    return basicNavigationItems;
  };

  const navigationItems = getFilteredNavigation();

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
              <h2 className="text-lg font-semibold">Payroll System</h2>
              <p className="text-xs text-muted-foreground">Gestión de Nómina</p>
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
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer informativo */}
      {!isCollapsed && (
        <div className="mt-auto px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-500 text-center">
            <span className="font-medium">Sistema de Nómina</span>
            <div className="mt-1">
              {user ? `Bienvenido ${user.email}` : 'Cargando...'}
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
