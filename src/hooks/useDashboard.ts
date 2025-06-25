
import { useState, useEffect } from 'react';
import { DashboardMetrics } from '@/types';
import { 
  DashboardService, 
  DashboardAlert, 
  RecentEmployee, 
  DashboardActivity 
} from '@/services/DashboardService';
import { useToast } from '@/hooks/use-toast';

export const useDashboard = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('🔄 Loading dashboard data...');

      // Cargar métricas principales primero
      const metricsData = await DashboardService.getDashboardMetrics();
      setMetrics(metricsData);
      console.log('✅ Metrics loaded:', metricsData);

      // Cargar datos adicionales en paralelo pero sin bloquear
      Promise.all([
        DashboardService.getDashboardAlerts().catch(err => {
          console.warn('Alerts failed to load:', err);
          return [];
        }),
        DashboardService.getRecentEmployees().catch(err => {
          console.warn('Recent employees failed to load:', err);
          return [];
        }),
        DashboardService.getDashboardActivity().catch(err => {
          console.warn('Activity failed to load:', err);
          return [];
        })
      ]).then(([alertsData, employeesData, activityData]) => {
        setAlerts(alertsData);
        setRecentEmployees(employeesData);
        setRecentActivity(activityData);
        console.log('✅ Additional data loaded');
      });

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      toast({
        title: "Error al cargar datos",
        description: "Algunos datos del dashboard no se pudieron cargar.",
        variant: "destructive"
      });
      
      // Establecer datos por defecto en caso de error
      setMetrics({
        totalEmpleados: 0,
        nominasProcesadas: 0,
        alertasLegales: 0,
        gastosNomina: 0,
        tendenciaMensual: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('🚀 Dashboard hook mounted, loading data...');
    loadDashboardData();
  }, []);

  const refreshDashboard = () => {
    console.log('🔄 Manual refresh triggered');
    loadDashboardData(true);
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await DashboardService.dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast({
        title: "Alerta descartada",
        description: "La alerta ha sido marcada como revisada."
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: "Error",
        description: "No se pudo descartar la alerta.",
        variant: "destructive"
      });
    }
  };

  // Computed values
  const highPriorityAlerts = alerts.filter(alert => alert.priority === 'high');
  const actionRequiredAlerts = alerts.filter(alert => alert.actionRequired);

  return {
    // Data
    metrics,
    alerts,
    recentEmployees,
    recentActivity,
    
    // Loading states
    loading,
    refreshing,
    
    // Actions
    refreshDashboard,
    dismissAlert,
    
    // Computed values
    highPriorityAlerts,
    actionRequiredAlerts
  };
};
