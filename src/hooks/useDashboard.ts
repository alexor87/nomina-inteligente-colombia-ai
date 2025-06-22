
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

      // Cargar datos en paralelo para mejor performance
      const [
        metricsData,
        alertsData,
        employeesData,
        activityData
      ] = await Promise.all([
        DashboardService.getDashboardMetrics(),
        DashboardService.getDashboardAlerts(),
        DashboardService.getRecentEmployees(),
        DashboardService.getDashboardActivity()
      ]);

      setMetrics(metricsData);
      setAlerts(alertsData);
      setRecentEmployees(employeesData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos del dashboard.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const refreshDashboard = () => {
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

  const getPayrollSummary = async () => {
    try {
      return await DashboardService.getPayrollSummary();
    } catch (error) {
      console.error('Error getting payroll summary:', error);
      throw error;
    }
  };

  const getComplianceStatus = async () => {
    try {
      return await DashboardService.getComplianceStatus();
    } catch (error) {
      console.error('Error getting compliance status:', error);
      throw error;
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
    getPayrollSummary,
    getComplianceStatus,
    
    // Computed values
    highPriorityAlerts,
    actionRequiredAlerts
  };
};
