
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Users, Calculator } from 'lucide-react';
import { SalaryDistribution } from '@/services/DashboardService';

interface SalaryAnalyticsProps {
  data: SalaryDistribution[];
  loading?: boolean;
}

export const SalaryAnalytics: React.FC<SalaryAnalyticsProps> = ({ 
  data, 
  loading = false 
}) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            <span>Análisis Salarial por Cargo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Cargando análisis...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            <span>Análisis Salarial por Cargo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-500">No hay datos salariales disponibles</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-purple-600" />
          <span>Análisis Salarial por Cargo</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Gráfico de barras */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  type="number"
                  tickFormatter={(value) => `$${(value/1000000).toFixed(1)}M`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis 
                  type="category"
                  dataKey="position"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  width={100}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Salario Promedio']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="averageSalary" 
                  fill="#8B5CF6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla detallada */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Detalle por Cargo</h4>
            <div className="grid gap-3">
              {data.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900">{item.position}</h5>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{item.employeeCount} empleado{item.employeeCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Promedio:</span>
                      <div className="font-medium">{formatCurrency(item.averageSalary)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Mínimo:</span>
                      <div className="font-medium">{formatCurrency(item.minSalary)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Máximo:</span>
                      <div className="font-medium">{formatCurrency(item.maxSalary)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
