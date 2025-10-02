import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaya } from './MayaProvider';

export const MayaGlobalManager: React.FC = () => {
  const location = useLocation();
  const { setPhase, showMessage } = useMaya();

  // Contexto por página - NO resetea el chat, solo actualiza visibilidad si es necesario
  useEffect(() => {
    const path = location.pathname;
    
    // Auto-show MAYA SOLO en página de nómina, sin resetear el chat existente
    if (path.includes('/payroll')) {
      showMessage(); // Auto-mostrar en página de nómina
    }
    // En otras páginas, el chat persiste pero no se muestra automáticamente
  }, [location.pathname, showMessage]);

  // No renderiza nada visible
  return null;
};