
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ConfigurationForm } from '@/components/settings/ConfigurationForm';

const SettingsPage = () => {
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        </div>
        <ConfigurationForm />
      </div>
    </Layout>
  );
};

export default SettingsPage;
