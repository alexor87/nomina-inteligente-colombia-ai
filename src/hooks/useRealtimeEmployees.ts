
import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeService, RealtimeEvent } from '@/services/RealtimeService';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

interface UseRealtimeEmployeesProps {
  onEmployeeChange?: () => void;
  enabled?: boolean;
}

export const useRealtimeEmployees = ({ 
  onEmployeeChange, 
  enabled = true 
}: UseRealtimeEmployeesProps = {}) => {
  const { toast } = useToast();

  const handleEmployeeEvent = useCallback((event: RealtimeEvent) => {
    if (!enabled) return;

    console.log('🧑‍💼 Employee realtime event:', event);

    switch (event.eventType) {
      case 'INSERT':
        toast({
          title: "✅ Nuevo empleado agregado",
          description: `${event.new?.nombre} ${event.new?.apellido} ha sido agregado al sistema`,
          className: "border-green-200 bg-green-50"
        });
        break;
      case 'UPDATE':
        toast({
          title: "🔄 Empleado actualizado",
          description: `Los datos de ${event.new?.nombre} ${event.new?.apellido} han sido actualizados`,
          className: "border-blue-200 bg-blue-50"
        });
        break;
      case 'DELETE':
        toast({
          title: "🗑️ Empleado eliminado",
          description: `${event.old?.nombre} ${event.old?.apellido} ha sido eliminado del sistema`,
          className: "border-orange-200 bg-orange-50"
        });
        break;
    }

    // Ejecutar callback si se proporciona
    if (onEmployeeChange) {
      onEmployeeChange();
    }
  }, [toast, onEmployeeChange, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let channelName: string;

    const setupSubscription = async () => {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (companyId) {
        const channel = RealtimeService.subscribeToEmployees(handleEmployeeEvent, companyId);
        channelName = `employees_${companyId}`;
      }
    };

    setupSubscription();

    return () => {
      if (channelName) {
        RealtimeService.unsubscribeFromTable(channelName);
      }
    };
  }, [handleEmployeeEvent, enabled]);
};
