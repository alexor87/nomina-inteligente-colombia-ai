
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeService } from '@/services/RealtimeService';

const RealtimeServiceComponent = () => {
  const { user, company } = useAuth();

  useEffect(() => {
    if (!user || !company?.id) {
      return;
    }

    console.log('🔔 Setting up realtime subscriptions for company:', company.id);

    // Subscribe to employees changes
    const employeesChannel = RealtimeService.subscribeToEmployees(
      (event) => {
        console.log('📊 Employee realtime event:', event);
        // You can dispatch custom events here if needed
        window.dispatchEvent(new CustomEvent('employeeUpdate', { detail: event }));
      },
      company.id
    );

    // Subscribe to payroll periods changes
    const payrollChannel = RealtimeService.subscribeToPayrollPeriods(
      (event) => {
        console.log('💰 Payroll realtime event:', event);
        window.dispatchEvent(new CustomEvent('payrollUpdate', { detail: event }));
      },
      company.id
    );

    // Subscribe to company settings changes
    const settingsChannel = RealtimeService.subscribeToCompanySettings(
      (event) => {
        console.log('⚙️ Settings realtime event:', event);
        window.dispatchEvent(new CustomEvent('settingsUpdate', { detail: event }));
      },
      company.id
    );

    // Subscribe to novedades changes
    const novedadesChannel = RealtimeService.subscribeToNovedades(
      (event) => {
        console.log('📝 Novedades realtime event:', event);
        window.dispatchEvent(new CustomEvent('novedadesUpdate', { detail: event }));
      },
      company.id
    );

    // Cleanup function
    return () => {
      console.log('🔕 Cleaning up realtime subscriptions');
      RealtimeService.unsubscribeAll();
    };
  }, [user, company?.id]);

  return null; // This component doesn't render anything
};

export default RealtimeServiceComponent;
