
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  Calculator
} from 'lucide-react';

const monthlyData = [
  { month: 'Ago', devengado: 15000000, deducciones: 2400000, neto: 12600000 },
  { month: 'Sep', devengado: 18000000, deducciones: 2880000, neto: 15120000 },
  { month: 'Oct', devengado: 16500000, deducciones: 2640000, neto: 13860000 },
  { month: 'Nov', devengado: 19200000, deducciones: 3072000, neto: 16128000 },
  { month: 'Dic', devengado: 22000000, deducciones: 3520000, neto: 18480000 },
  { month: 'Ene', devengado: 17800000, deducciones: 2848000, neto: 14952000 },
];

const distributionData = [
  { name: 'Salarios Base', value: 70, color: '#3B82F6' },
  { name: 'Horas Extra', value: 8, color: '#10B981' },
  { name: 'Bonificaciones', value: 12, color: '#F59E0B' },
  { name: 'Aux. Transporte', value: 10, color: '#8B5CF6' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export const PayrollAnalytics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tendencia de Nómina */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Tendencia de Nómina (6 meses)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value/1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  labelFormatter={(label) => `Mes: ${label}`}
                />
                <Bar dataKey="devengado" fill="#3B82F6" name="Devengado" />
                <Bar dataKey="deducciones" fill="#EF4444" name="Deducciones" />
                <Bar dataKey="neto" fill="#10B981" name="Neto" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribución de Conceptos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            <span>Distribución de Conceptos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Porcentaje']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {distributionData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
