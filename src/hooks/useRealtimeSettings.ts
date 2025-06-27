
import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeService, RealtimeEvent } from '@/services/RealtimeService';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

interface UseRealtimeSettingsProps {
  onSettingsChange?: () => void;
  enabled?: boolean;
}

export const useRealtimeSettings = ({ 
  onSettingsChange, 
  enabled = true 
}: UseRealtimeSettingsProps = {}) => {
  const { toast } = useToast();

  const handleSettingsEvent = useCallback((event: RealtimeEvent) => {
    if (!enabled) return;

    console.log('⚙️ Settings realtime event:', event);

    switch (event.eventType) {
      case 'INSERT':
        toast({
          title: "✅ Configuración creada",
          description: "La configuración de la empresa ha sido creada exitosamente",
          className: "border-green-200 bg-green-50"
        });
        break;
      case 'UPDATE':
        toast({
          title: "✅ Configuración actualizada",
          description: "Los cambios en la configuración se han guardado exitosamente",
          className: "border-green-200 bg-green-50"
        });
        break;
    }

    if (onSettingsChange) {
      onSettingsChange();
    }
  }, [toast, onSettingsChange, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let channelName: string;

    const setupSubscription = async () => {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (companyId) {
        RealtimeService.subscribeToCompanySettings(handleSettingsEvent, companyId);
        channelName = `company_settings_${companyId}`;
      }
    };

    setupSubscription();

    return () => {
      if (channelName) {
        RealtimeService.unsubscribeFromTable(channelName);
      }
    };
  }, [handleSettingsEvent, enabled]);
};
