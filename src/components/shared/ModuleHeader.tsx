import React from 'react';
import { useLocation } from 'react-router-dom';
import { CompanySelector } from '@/components/layout/CompanySelector';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import { motion } from 'framer-motion';

export const ModuleHeader: React.FC = () => {
  const location = useLocation();
  
  const getTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Panel de Control';
    if (location.pathname.includes('/employees')) return 'Gestión de Empleados';
    if (location.pathname.includes('/payroll-history')) return 'Historial de Nómina';
    if (location.pathname.includes('/payroll')) return 'Liquidación de Nómina';
    if (location.pathname.includes('/prestaciones-sociales')) return 'Prestaciones Sociales';
    if (location.pathname.includes('/vacations-absences')) return 'Vacaciones y Ausencias';
    if (location.pathname.includes('/reports')) return 'Reportes';
    if (location.pathname.includes('/settings')) return 'Configuración';
    if (location.pathname.includes('/profile')) return 'Perfil';
    return 'Sistema de Nómina';
  };
  
  return (
    <motion.header 
      className="border-b border-border bg-white/80 backdrop-blur-sm relative z-20"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{getTitle()}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <CompanySelector />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </motion.header>
  );
};
