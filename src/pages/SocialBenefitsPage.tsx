
import React from 'react';
import { SocialBenefitsDashboard } from '@/components/social-benefits/SocialBenefitsDashboard';

const SocialBenefitsPage = () => {
  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prestaciones Sociales</h1>
        <p className="text-gray-600">Gestiona cesantías, prima de servicios e intereses de cesantías</p>
      </div>
      <SocialBenefitsDashboard />
    </div>
  );
};

export default SocialBenefitsPage;
