import React from 'react';
import { useLocation } from 'react-router-dom';
import { MayaPageHeader } from '@/components/maya-page/MayaPageHeader';
import { ModuleHeader } from './ModuleHeader';
import { AdminNotificationBell } from '@/components/notifications/AdminNotificationBell';

export const DynamicHeader: React.FC = () => {
  const location = useLocation();
  const isMayaRoute = location.pathname === '/maya';
  
  if (isMayaRoute) {
    return <MayaPageHeader />;
  }
  
  return (
    <div className="flex items-center">
      <div className="flex-1">
        <ModuleHeader />
      </div>
      <div className="pr-4">
        <AdminNotificationBell />
      </div>
    </div>
  );
};
