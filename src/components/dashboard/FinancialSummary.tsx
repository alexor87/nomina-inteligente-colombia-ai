
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calculator
} from 'lucide-react';
import { ChartCard } from './ChartCard';

const costTrendData = [
  { month: 'Jul', costo: 14500000, presupuesto: 15000000 },
  { month: 'Ago', costo: 15200000, presupuesto: 15000000 },
  { month: 'Sep', costo: 18300000, presupuesto: 17000000 },
  { month: 'Oct', costo: 16800000, presupuesto: 17000000 },
  { month: 'Nov', costo: 19500000, presupuesto: 18000000 },
  { month: 'Dic', costo: 22200000, presupuesto: 20000000 },
];

const categoryData = [
  { categoria: 'Salarios', monto: 15400000, porcentaje: 68 },
  { categoria: 'Seguridad Social', monto: 4200000, porcentaje: 18.5 },
  { categoria: 'Prestaciones', monto: 2100000, porcentaje: 9.3 },
  { categoria: 'Otros', monto: 900000, porcentaje: 4.2 },
];

export const FinancialSummary: React.FC = () => {
  const totalCost = costTrendData[costTrendData.length - 1].costo;
  const previousCost = costTrendData[costTrendData.length - 2].costo;
  const costChange = ((totalCost - previousCost) / previousCost * 100);
  
  return (
    <div className="space-y-6">
      {/* Métricas Financieras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard
          title="Costo Total Nómina"
          value={`$${(totalCost / 1000000).toFixed(1)}M`}
          change={costChange}
          changeLabel="vs mes anterior"
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
          subtitle="Enero 2025"
        />
        
        <ChartCard
          title="Presupuesto Restante"
          value={`$${((20000000 - totalCost) / 1000000).toFixed(1)}M`}
          change={-12.5}
          changeLabel="de presupuesto"
          icon={<Target className="h-5 w-5" />}
          color="yellow"
          subtitle="vs presupuestado"
        />
        
        <ChartCard
          title="Costo por Empleado"
          value={`$${(totalCost / 25 / 1000).toFixed(0)}K`}
          change={8.2}
          changeLabel="promedio mensual"
          icon={<Calculator className="h-5 w-5" />}
          color="blue"
          subtitle="25 empleados activos"
        />
        
        <ChartCard
          title="Eficiencia Presupuestal"
          value="89%"
          change={-5.3}
          changeLabel="del presupuesto"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
          subtitle="Utilización actual"
        />
      </div>

      {/* Gráficos Financieros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de Costos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Tendencia de Costos Laborales</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value/1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString()}`, 
                      name === 'costo' ? 'Costo Real' : 'Presupuesto'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="presupuesto" 
                    stackId="1"
                    stroke="#94A3B8" 
                    fill="#94A3B8" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="costo" 
                    stackId="2"
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribución por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <span>Distribución de Costos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {item.categoria}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        ${item.monto.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.porcentaje}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Total</span>
                </div>
                <span className="text-lg font-bold text-blue-900">
                  ${categoryData.reduce((sum, item) => sum + item.monto, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
