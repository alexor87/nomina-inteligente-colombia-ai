
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboard } from '@/hooks/useDashboard';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { 
  RefreshCw, 
  Users, 
  Calculator, 
  FileText,
  TrendingUp,
  BarChart3,
  DollarSign,
  Clock,
  Plus
} from 'lucide-react';

// Importar los nuevos componentes con datos reales
import { QuickActions } from './QuickActions';
import { RealPayrollTrends } from './RealPayrollTrends';
import { SalaryAnalytics } from './SalaryAnalytics';
import { EfficiencyMetrics } from './EfficiencyMetrics';

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
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Cargando dashboard...</h3>
            <p className="text-gray-600">Preparando tus datos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header Simplificado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting} 👋
          </h1>
          <p className="text-gray-600">
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
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={() => navigate('/app/payroll')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Procesar Nómina
          </Button>
        </div>
      </div>

      {/* Métricas Principales - Grid Simple */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Empleados Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalEmpleados}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nóminas Procesadas</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.nominasProcesadas}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Costo Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(metrics.gastosNomina / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tendencia</p>
                  <p className="text-2xl font-bold text-gray-900">+{metrics.tendenciaMensual}%</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido Principal con Tabs Simplificados */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Análisis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métricas de Eficiencia */}
          <EfficiencyMetrics data={efficiencyMetrics} loading={loading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickActions />

            {/* Empleados y Actividad Simplificados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Empleados Recientes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEmployees.length > 0 ? (
                    recentEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.position}</p>
                          </div>
                        </div>
                        <Badge variant={employee.status === 'activo' ? 'default' : 'secondary'}>
                          {employee.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay empleados recientes</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actividad Reciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span>Actividad Reciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                        {activity.type === 'payroll' ? '💰' :
                         activity.type === 'employee' ? '👤' :
                         activity.type === 'report' ? '📊' : '💳'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-gray-500">por {activity.user}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Tendencias de Nómina con Datos Reales */}
          <RealPayrollTrends data={payrollTrends} loading={loading} />
          
          {/* Análisis Salarial con Datos Reales */}
          <SalaryAnalytics data={salaryDistribution} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
