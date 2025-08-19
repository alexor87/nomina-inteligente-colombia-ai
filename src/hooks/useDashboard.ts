
import { useState, useEffect } from 'react';
import { DashboardMetrics } from '@/types';
import { 
  DashboardService, 
  RecentEmployee, 
  DashboardActivity,
  MonthlyPayrollTrend,
  EfficiencyMetric
} from '@/services/DashboardService';
import { useToast } from '@/hooks/use-toast';

export const useDashboard = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [payrollTrends, setPayrollTrends] = useState<MonthlyPayrollTrend[]>([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetric[]>([]);
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
        employeesData,
        activityData,
        trendsData,
        efficiencyData
      ] = await Promise.all([
        DashboardService.getDashboardMetrics(),
        DashboardService.getRecentEmployees(),
        DashboardService.getDashboardActivity(),
        DashboardService.getMonthlyPayrollTrends(),
        DashboardService.getEfficiencyMetrics()
      ]);

      setMetrics(metricsData);
      setRecentEmployees(employeesData);
      setRecentActivity(activityData);
      setPayrollTrends(trendsData);
      setEfficiencyMetrics(efficiencyData);
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

  return {
    // Data
    metrics,
    recentEmployees,
    recentActivity,
    payrollTrends,
    efficiencyMetrics,
    
    // Loading states
    loading,
    refreshing,
    
    // Actions
    refreshDashboard
  };
};
