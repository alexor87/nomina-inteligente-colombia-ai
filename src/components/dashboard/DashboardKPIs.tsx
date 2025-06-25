
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, CheckCircle, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { DashboardMetrics } from '@/types';

interface DashboardKPIsProps {
  metrics: DashboardMetrics | null;
}

export const DashboardKPIs = ({ metrics }: DashboardKPIsProps) => {
  if (!metrics) return null;

  const kpis = [
    {
      title: 'Empleados Activos',
      value: metrics.totalEmpleados,
      change: 8,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      title: 'Nóminas Procesadas',
      value: metrics.nominasProcesadas,
      change: 12,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      title: 'Alertas Legales',
      value: metrics.alertasLegales,
      change: -25,
      icon: AlertTriangle,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-100'
    },
    {
      title: 'Costo Nómina Mensual',
      value: `$${(metrics.gastosNomina / 1000000).toFixed(1)}M`,
      change: metrics.tendenciaMensual,
      icon: DollarSign,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      title: 'Estado del Ciclo',
      value: 'En Progreso',
      change: null,
      icon: Clock,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-100',
      progress: 75
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className={`${kpi.bgColor} ${kpi.borderColor} border-2 hover:shadow-md transition-shadow`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              {kpi.change !== null && (
                <div className={`flex items-center text-sm ${
                  kpi.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.change > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">
                {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
              </p>
              <p className="text-xs font-medium text-gray-600">{kpi.title}</p>
              
              {kpi.progress && (
                <div className="pt-2">
                  <Progress value={kpi.progress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">{kpi.progress}% completado</p>
                </div>
              )}
              
              {kpi.change !== null && (
                <p className="text-xs text-gray-500">
                  vs. mes anterior
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
