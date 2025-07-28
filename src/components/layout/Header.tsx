
import React from 'react';
import { UserMenu } from './UserMenu';
import { CompanySelector } from './CompanySelector';
import { NotificationBell } from './NotificationBell';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-4">
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Sistema de Nómina
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <CompanySelector />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
