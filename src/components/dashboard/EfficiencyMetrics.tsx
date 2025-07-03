
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users, Calculator } from 'lucide-react';
import { EfficiencyMetric } from '@/services/DashboardService';

interface EfficiencyMetricsProps {
  data: EfficiencyMetric[];
  loading?: boolean;
}

export const EfficiencyMetrics: React.FC<EfficiencyMetricsProps> = ({ 
  data, 
  loading = false 
}) => {
  const formatValue = (value: number, unit: string) => {
    if (unit === 'COP') {
      return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    return `${value.toLocaleString()} ${unit}`;
  };

  const getIcon = (metric: string) => {
    switch (metric) {
      case 'Costo Total Nómina':
        return <DollarSign className="h-5 w-5" />;
      case 'Salario Promedio':
        return <Calculator className="h-5 w-5" />;
      case 'Empleados Procesados':
        return <Users className="h-5 w-5" />;
      default:
        return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getIconColor = (metric: string) => {
    switch (metric) {
      case 'Costo Total Nómina':
        return 'text-green-600';
      case 'Salario Promedio':
        return 'text-blue-600';
      case 'Empleados Procesados':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Eficiencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No hay métricas disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {metric.metric}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatValue(metric.value, metric.unit)}
                </p>
                <div className={`flex items-center space-x-1 mt-2 ${
                  metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500">vs mes anterior</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg bg-gray-50 ${getIconColor(metric.metric)}`}>
                {getIcon(metric.metric)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
