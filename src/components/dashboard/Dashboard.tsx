
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
  Calendar,
  Bell,
  BarChart3,
  DollarSign,
  Building2,
  Clock,
  Plus,
  Settings
} from 'lucide-react';

// Importar los componentes simplificados
import { QuickActions } from './QuickActions';
import { ComplianceCalendar } from './ComplianceCalendar';
import { PayrollAnalytics } from './PayrollAnalytics';
import { NotificationCenter } from './NotificationCenter';
import { FinancialSummary } from './FinancialSummary';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { companyId } = useCurrentCompany();
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

      {/* Alertas Críticas - Solo si existen */}
      {highPriorityAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {highPriorityAlerts.slice(0, 2).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{alert.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                      <p className="text-xs text-gray-600">{alert.description}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => dismissAlert(alert.id)}>
                    Revisar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principales - Grid Simple */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Empleados</p>
                  <p className="text-2xl font-bold">{metrics.totalEmpleados}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nóminas</p>
                  <p className="text-2xl font-bold">{metrics.nominasProcesadas}</p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Alertas</p>
                  <p className="text-2xl font-bold">{metrics.alertasLegales}</p>
                </div>
                <Bell className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gastos</p>
                  <p className="text-2xl font-bold">${(metrics.gastosNomina / 1000000).toFixed(1)}M</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido Principal con Tabs Simplificados */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <Calculator className="h-4 w-4 mr-2" />
            Nómina
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Calendar className="h-4 w-4 mr-2" />
            Obligaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickActions />
            <NotificationCenter />
          </div>

          {/* Empleados y Actividad Simplificados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Empleados Recientes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between">
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
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span>Actividad Reciente</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3">
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <FinancialSummary />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollAnalytics />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
};
