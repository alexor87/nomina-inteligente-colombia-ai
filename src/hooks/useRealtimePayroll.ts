
import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeService, RealtimeEvent } from '@/services/RealtimeService';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

interface UseRealtimePayrollProps {
  onPayrollChange?: () => void;
  enabled?: boolean;
}

export const useRealtimePayroll = ({ 
  onPayrollChange, 
  enabled = true 
}: UseRealtimePayrollProps = {}) => {
  const { toast } = useToast();

  const handlePayrollEvent = useCallback((event: RealtimeEvent) => {
    if (!enabled) return;

    console.log('💰 Payroll realtime event:', event);

    switch (event.eventType) {
      case 'INSERT':
        if (event.table === 'payroll_periods') {
          toast({
            title: "✅ Nuevo período de nómina",
            description: "Se ha creado un nuevo período de nómina",
            className: "border-green-200 bg-green-50"
          });
        }
        break;
      case 'UPDATE':
        if (event.table === 'payroll_periods') {
          const newStatus = event.new?.estado;
          if (newStatus === 'aprobado') {
            toast({
              title: "🎉 Período aprobado",
              description: "El período de nómina ha sido aprobado exitosamente",
              className: "border-green-200 bg-green-50"
            });
          } else {
            toast({
              title: "🔄 Período actualizado",
              description: "Los datos del período han sido actualizados",
              className: "border-blue-200 bg-blue-50"
            });
          }
        }
        break;
    }

    if (onPayrollChange) {
      onPayrollChange();
    }
  }, [toast, onPayrollChange, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let channelNames: string[] = [];

    const setupSubscriptions = async () => {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (companyId) {
        // Suscribirse a períodos de nómina
        RealtimeService.subscribeToPayrollPeriods(handlePayrollEvent, companyId);
        channelNames.push(`payroll_periods_${companyId}`);

        // Suscribirse a novedades
        RealtimeService.subscribeToNovedades(handlePayrollEvent, companyId);
        channelNames.push(`payroll_novedades_${companyId}`);
      }
    };

    setupSubscriptions();

    return () => {
      channelNames.forEach(channelName => {
        RealtimeService.unsubscribeFromTable(channelName);
      });
    };
  }, [handlePayrollEvent, enabled]);
};
