
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardKPIs } from './DashboardKPIs';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardAlerts } from './DashboardAlerts';
import { DashboardRecentEmployees } from './DashboardRecentEmployees';
import { DashboardActivity } from './DashboardActivity';
import { DashboardCharts } from './DashboardCharts';
import { DashboardCalendar } from './DashboardCalendar';
import { useDashboard } from '@/hooks/useDashboard';
import { RefreshCw, Download, Settings, Bell } from 'lucide-react';

export const Dashboard = () => {
  const {
    metrics,
    alerts,
    recentEmployees,
    recentActivity,
    loading,
    refreshing,
    refreshDashboard,
    dismissAlert,
    highPriorityAlerts
  } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Resumen ejecutivo de tu sistema de nómina
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshDashboard}
              disabled={refreshing}
              className="border-gray-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-200"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPIs Section */}
        <DashboardKPIs metrics={metrics} />

        {/* Quick Actions */}
        <DashboardQuickActions />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts & Charts */}
          <div className="lg:col-span-2 space-y-6">
            <DashboardAlerts 
              alerts={alerts}
              onDismissAlert={dismissAlert}
            />
            <DashboardCharts />
          </div>

          {/* Right Column - Recent Data & Calendar */}
          <div className="space-y-6">
            <DashboardRecentEmployees employees={recentEmployees} />
            <DashboardActivity activities={recentActivity} />
            <DashboardCalendar />
          </div>
        </div>
      </div>
    </div>
  );
};
