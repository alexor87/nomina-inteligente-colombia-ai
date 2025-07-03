
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
  Clock
} from 'lucide-react';

// Importar los nuevos componentes
import { ChartCard } from './ChartCard';
import { QuickActions } from './QuickActions';
import { ComplianceCalendar } from './ComplianceCalendar';
import { PayrollAnalytics } from './PayrollAnalytics';
import { NotificationCenter } from './NotificationCenter';
import { FinancialSummary } from './FinancialSummary';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { companyInfo } = useCurrentCompany();
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
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Cargando dashboard...</h3>
            <p className="text-gray-600">Preparando tus datos empresariales</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header Mejorado */}
      <div className="bg-white rounded-xl shadow-sm border-0 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {greeting} 👋
                </h1>
                <p className="text-gray-600">
                  Bienvenido a {companyInfo?.razon_social || 'tu empresa'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{new Date().toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={refreshDashboard}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
              onClick={() => navigate('/app/payroll')}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Procesar Nómina
            </Button>
          </div>
        </div>
      </div>

      {/* Alertas de Alta Prioridad */}
      {highPriorityAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Atención Requerida ({highPriorityAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highPriorityAlerts.slice(0, 2).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{alert.icon}</span>
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

      {/* Métricas Principales Rediseñadas */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ChartCard
            title="Total Empleados"
            value={metrics.totalEmpleados}
            change={8}
            changeLabel="vs mes anterior"
            icon={<Users className="h-5 w-5" />}
            color="blue"
            subtitle="Empleados activos"
          />
          <ChartCard
            title="Nóminas Procesadas"
            value={metrics.nominasProcesadas}
            change={12}
            changeLabel="este mes"
            icon={<FileText className="h-5 w-5" />}
            color="green"
            subtitle="Períodos completados"
          />
          <ChartCard
            title="Alertas Pendientes"
            value={metrics.alertasLegales}
            change={-25}
            changeLabel="reducción"
            icon={<Bell className="h-5 w-5" />}
            color="yellow"
            subtitle="Requieren atención"
          />
          <ChartCard
            title="Gastos Nómina"
            value={`$${(metrics.gastosNomina / 1000000).toFixed(1)}M`}
            change={metrics.tendenciaMensual}
            changeLabel="crecimiento"
            icon={<DollarSign className="h-5 w-5" />}
            color="purple"
            subtitle="Mes actual"
          />
        </div>
      )}

      {/* Contenido Principal con Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financiero</span>
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Nómina</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Cumplimiento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Acciones Rápidas */}
            <div className="lg:col-span-2">
              <QuickActions />
            </div>
            
            {/* Centro de Notificaciones */}
            <div>
              <NotificationCenter />
            </div>
          </div>

          {/* Empleados y Actividad */}
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
                    <div key={employee.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-600">{employee.position}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{employee.dateAdded}</p>
                        <Badge 
                          variant={employee.status === 'activo' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {employee.status}
                        </Badge>
                      </div>
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
                    <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === 'payroll' ? 'bg-green-100 text-green-600' :
                        activity.type === 'employee' ? 'bg-blue-100 text-blue-600' :
                        activity.type === 'report' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {activity.type === 'payroll' ? '💰' :
                         activity.type === 'employee' ? '👤' :
                         activity.type === 'report' ? '📊' : '💳'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-600">por {activity.user}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
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
