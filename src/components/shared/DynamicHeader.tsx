import React from 'react';
import { useLocation } from 'react-router-dom';
import { MayaPageHeader } from '@/components/maya-page/MayaPageHeader';
import { ModuleHeader } from './ModuleHeader';

export const DynamicHeader: React.FC = () => {
  const location = useLocation();
  const isMayaRoute = location.pathname === '/maya';
  
  if (isMayaRoute) {
    return <MayaPageHeader />;
  }
  
  return <ModuleHeader />;
};
