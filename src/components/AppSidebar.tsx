
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  FileBarChart,
  Settings,
  Building2,
  Calculator,
  Calendar,
  PiggyBank,
  Brain,
  Sparkles
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

const navigationItems = [
  {
    title: "MAYA",
    url: "/app/maya",
    icon: Brain,
    badge: "IA",
    animated: true,
  },
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
    title: "Liquidación",
    url: "/app/payroll",
    icon: Calculator,
  },
  {
    title: "Prestaciones Sociales",
    url: "/app/prestaciones-sociales",
    icon: PiggyBank,
  },
  {
    title: "Vacaciones y Ausencias",
    url: "/app/vacations-absences",
    icon: Calendar,
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
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  console.log('🔍 AppSidebar Debug:', {
    currentPath,
    isCollapsed,
    navigationItems: navigationItems.map(item => ({
      title: item.title,
      url: item.url,
      isActive: currentPath === item.url
    }))
  });

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
              <p className="text-xs text-muted-foreground">Gestión de Empleados</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = currentPath === item.url;
                const isMaya = item.title === "MAYA";
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => 
                          isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50"
                        }
                      >
                        <div className={`relative mr-2 ${isMaya ? 'animate-pulse' : ''}`}>
                          <item.icon className="h-4 w-4" />
                          {isMaya && (
                            <>
                              <Sparkles className="h-2 w-2 absolute -top-1 -right-1 text-purple-400 animate-pulse" />
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-sm opacity-50 animate-pulse"></div>
                            </>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span className={isMaya ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold' : ''}>
                            {item.title}
                          </span>
                        )}
                        {!isCollapsed && item.badge && (
                          <span className="ml-auto text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
