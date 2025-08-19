
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/useDashboard';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { RefreshCw, Calculator } from 'lucide-react';

// Componentes minimalistas
import { MinimalMetricCard } from './MinimalMetricCard';
import { SimpleQuickActions } from './SimpleQuickActions';
import { MinimalEmployeeList } from './MinimalEmployeeList';
import { MinimalActivityFeed } from './MinimalActivityFeed';
import { EfficiencyMetrics } from './EfficiencyMetrics';
import { RealPayrollTrends } from './RealPayrollTrends';
import { SalaryAnalytics } from './SalaryAnalytics';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { companyId } = useCurrentCompany();
  const {
    metrics,
    recentEmployees,
    recentActivity,
    payrollTrends,
    salaryDistribution,
    efficiencyMetrics,
    loading,
    refreshing,
    refreshDashboard
  } = useDashboard();

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Cargando dashboard...</h3>
            <p className="text-muted-foreground">Preparando tus datos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-8 p-8">
        {/* Header Minimalista */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {greeting}
            </h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshDashboard}
              disabled={refreshing}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              onClick={() => navigate('/app/payroll')}
              className="bg-primary hover:bg-primary/90"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Procesar Nómina
            </Button>
          </div>
        </div>

        {/* Métricas Principales - Layout Horizontal Minimalista */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MinimalMetricCard
              title="Empleados Activos"
              value={metrics.totalEmpleados}
              subtitle="Total registrados"
            />
            <MinimalMetricCard
              title="Nóminas Procesadas"
              value={metrics.nominasProcesadas}
              subtitle="Este mes"
            />
            <MinimalMetricCard
              title="Costo Total"
              value={`$${(metrics.gastosNomina / 1000000).toFixed(1)}M`}
              subtitle="Último período"
            />
            <MinimalMetricCard
              title="Tendencia"
              value={`${metrics.tendenciaMensual}%`}
              change={metrics.tendenciaMensual}
              subtitle="Crecimiento mensual"
            />
          </div>
        )}

        {/* Métricas de Eficiencia */}
        <EfficiencyMetrics data={efficiencyMetrics} loading={loading} />

        {/* Contenido Principal - Sin Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda - Acciones y Empleados */}
          <div className="space-y-6">
            <SimpleQuickActions />
            <MinimalEmployeeList employees={recentEmployees} />
          </div>

          {/* Columna Central - Actividad */}
          <div className="space-y-6">
            <MinimalActivityFeed activities={recentActivity} />
          </div>

          {/* Columna Derecha - Análisis */}
          <div className="space-y-6">
            <RealPayrollTrends data={payrollTrends} loading={loading} />
          </div>
        </div>

        {/* Análisis Salarial - Full Width */}
        <div className="w-full">
          <SalaryAnalytics data={salaryDistribution} loading={loading} />
        </div>
      </div>
    </div>
  );
};
