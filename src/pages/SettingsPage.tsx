
import React from 'react';
import { CompanySettingsForm } from '@/components/company/CompanySettingsForm';

const SettingsPage = () => {
  return (
    <div className="px-6 py-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra las configuraciones de tu empresa</p>
      </div>
      
      <CompanySettingsForm />
    </div>
  );
};

export default SettingsPage;
