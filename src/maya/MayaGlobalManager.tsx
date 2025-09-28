import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaya } from './MayaProvider';

export const MayaGlobalManager: React.FC = () => {
  const location = useLocation();
  const { setPhase, showMessage } = useMaya();

  // Contexto por página
  useEffect(() => {
    const path = location.pathname;
    
    // Auto-show MAYA en páginas clave con contexto específico
    if (path.includes('/payroll')) {
      setPhase('initial', {
        periodName: 'Gestión de Nómina'
      });
      showMessage(); // Auto-mostrar en página de nómina
    } else if (path.includes('/employees')) {
      setPhase('initial', {
        periodName: 'Gestión de Empleados'
      });
    } else if (path.includes('/reports')) {
      setPhase('initial', {
        periodName: 'Reportes y Análisis'
      });
    } else if (path.includes('/dashboard')) {
      setPhase('initial', {
        periodName: 'Dashboard Principal'
      });
    }
  }, [location.pathname, setPhase, showMessage]);

  // No renderiza nada visible
  return null;
};