
import { useState, useEffect } from 'react';
import { CompanySettingsService } from '@/services/CompanySettingsService';

export const useProvisionMode = (companyId: string | undefined) => {
  const [provisionMode, setProvisionMode] = useState<'on_liquidation' | 'monthly_consolidation'>('on_liquidation');
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const loadProvisionMode = async () => {
      if (!companyId) return;
      
      try {
        const settings = await CompanySettingsService.getCompanySettings(companyId);
        setProvisionMode(settings?.provision_mode || 'on_liquidation');
      } catch (error) {
        console.error('Error loading provision mode:', error);
        setProvisionMode('on_liquidation'); // fallback
      } finally {
        setLoadingSettings(false);
      }
    };

    loadProvisionMode();
  }, [companyId]);

  return { provisionMode, loadingSettings };
};
