import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SuperAdminService } from '@/services/SuperAdminService';
import { AdminExportService } from '@/services/AdminExportService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, TrendingUp, AlertTriangle, DollarSign, Clock, Percent, UserCheck, TrendingDown, Download } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#f59e0b', '#10b981', '#ef4444'];

const AdminDashboardPage: React.FC = () => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => SuperAdminService.getDashboardMetrics(),
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Error al cargar métricas: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard SaaS</h1>
          <p className="text-muted-foreground text-sm">Métricas de negocio en tiempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => AdminExportService.exportDashboardMetricsToExcel(metrics)}>
          <Download className="h-4 w-4 mr-2" /> Exportar Métricas
        </Button>
      </div>

      {/* KPI Cards — Row 1: Core */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Building2 className="h-3.5 w-3.5" /> Total Empresas
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.totalCompanies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Activas
            </div>
            <p className="text-2xl font-bold text-green-600">{metrics.activeCompanies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" /> En Trial
            </div>
            <p className="text-2xl font-bold text-blue-600">{metrics.trialCompanies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" /> MRR
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(metrics.mrr)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Empleados
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.totalEmployees}</p>
          </CardContent>
        </Card>
        <Card className={metrics.expiringTrials > 0 ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Trials x vencer
            </div>
            <p className="text-2xl font-bold text-yellow-600">{metrics.expiringTrials}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards — Row 2: Advanced */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingDown className="h-3.5 w-3.5" /> Churn Rate (30d)
            </div>
            <p className="text-2xl font-bold text-foreground">{(metrics.churnRate ?? 0).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Empresas suspendidas / activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" /> ARPU
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(metrics.arpu ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Ingreso promedio por empresa activa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <UserCheck className="h-3.5 w-3.5" /> Conversión Trial → Pago
            </div>
            <p className="text-2xl font-bold text-foreground">{(metrics.trialConversion ?? 0).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">De trials totales a activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución por Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.planDistribution}
                    cx="50%" cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {metrics.planDistribution.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Sin datos de distribución
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Crecimiento (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="companies" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue por Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {(metrics.revenuePerPlan || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.revenuePerPlan}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Sin datos de revenue
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
