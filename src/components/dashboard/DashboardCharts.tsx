
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, BarChart3, Download } from 'lucide-react';

export const DashboardCharts = () => {
  // Mock data for charts
  const payrollEvolution = [
    { month: 'Ene', amount: 45000000 },
    { month: 'Feb', amount: 48000000 },
    { month: 'Mar', amount: 52000000 },
    { month: 'Abr', amount: 49000000 },
    { month: 'May', amount: 55000000 },
    { month: 'Jun', amount: 58000000 }
  ];

  const contractDistribution = [
    { type: 'Indefinido', count: 45, color: '#3B82F6' },
    { type: 'Fijo', count: 12, color: '#10B981' },
    { type: 'Obra/Labor', count: 8, color: '#F59E0B' },
    { type: 'Prestación', count: 5, color: '#EF4444' }
  ];

  const complianceData = [
    { category: 'Seguridad Social', progress: 95 },
    { category: 'Retención Fuente', progress: 88 },
    { category: 'Parafiscales', progress: 92 },
    { category: 'Documentos', progress: 78 }
  ];

  const chartConfig = {
    amount: {
      label: "Monto"
    },
    count: {
      label: "Cantidad"
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Payroll Evolution Chart */}
      <Card className="bg-white border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Evolución Nómina Mensual
            </span>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <LineChart data={payrollEvolution}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value) => [`$${(Number(value) / 1000000).toFixed(1)}M`, 'Nómina']}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Contract Distribution Chart */}
      <Card className="bg-white border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Distribución por Contrato
            </span>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <ChartContainer config={chartConfig} className="h-48">
              <PieChart>
                <Pie
                  data={contractDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="count"
                >
                  {contractDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            
            <div className="space-y-3">
              {contractDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {item.type}
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-gray-100">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card className="bg-white border-gray-100 lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Cumplimiento Legal</span>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              88% Completo
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {item.category}
                  </span>
                  <span className="text-sm text-gray-600">
                    {item.progress}%
                  </span>
                </div>
                <Progress 
                  value={item.progress} 
                  className={`h-2 ${
                    item.progress >= 90 ? 'text-green-600' :
                    item.progress >= 80 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}
                />
                <p className="text-xs text-gray-500">
                  {item.progress >= 90 ? '✅ Completo' :
                   item.progress >= 80 ? '⚠️ Revisar' :
                   '❌ Acción requerida'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
