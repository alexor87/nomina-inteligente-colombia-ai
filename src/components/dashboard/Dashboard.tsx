
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from './MetricCard';
import { useDashboard } from '@/hooks/useDashboard';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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

  const [payrollSummary, setPayrollSummary] = useState<any>(null);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen ejecutivo de tu sistema de nómina</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={refreshDashboard}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            Procesar Nómina
          </Button>
          <Button variant="outline">
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* Alertas de alta prioridad */}
      {highPriorityAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Atención Requerida ({highPriorityAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highPriorityAlerts.slice(0, 2).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex items-center">
                    <span className="mr-2">{alert.icon}</span>
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

      {/* Métricas principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Empleados"
            value={metrics.totalEmpleados}
            change={8}
            icon="👥"
            color="blue"
          />
          <MetricCard
            title="Nóminas Procesadas"
            value={metrics.nominasProcesadas}
            change={12}
            icon="✅"
            color="green"
          />
          <MetricCard
            title="Alertas Legales"
            value={metrics.alertasLegales}
            change={-25}
            icon="⚠️"
            color="yellow"
          />
          <MetricCard
            title="Gastos Nómina"
            value={`$${(metrics.gastosNomina / 1000000).toFixed(1)}M`}
            change={metrics.tendenciaMensual}
            icon="💰"
            color="green"
          />
        </div>
      )}

      {/* Sección de alertas y empleados recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Alertas Importantes</span>
              <Badge variant="secondary">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert) => (
                <div 
                  key={alert.id}
                  className={`flex items-center p-3 rounded-lg border ${
                    alert.type === 'error' ? 'bg-red-50 border-red-200' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <span className="mr-3">{alert.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600">{alert.description}</p>
                  </div>
                  {alert.actionRequired && (
                    <Badge variant="outline" className="ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      Acción
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empleados Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-semibold mr-3">
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
      </div>

      {/* Actividad reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    activity.type === 'payroll' ? 'bg-green-100 text-green-600' :
                    activity.type === 'employee' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'report' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {activity.type === 'payroll' ? '💰' :
                     activity.type === 'employee' ? '👤' :
                     activity.type === 'report' ? '📊' : '💳'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">por {activity.user}</p>
                  </div>
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
  );
};
