
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SummaryCardsProps {
  totals: {
    count: number;
    total: number;
    byType: {
      cesantias: number;
      prima: number;
      intereses_cesantias: number;
      vacaciones: number;
    };
  };
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ totals }) => {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  const summaryItems = [
    {
      title: 'Total Empleados',
      value: totals.count.toString(),
    },
    {
      title: 'Cesantías',
      value: formatCurrency(totals.byType.cesantias),
    },
    {
      title: 'Prima de Servicios',
      value: formatCurrency(totals.byType.prima),
    },
    {
      title: 'Total Provisiones',
      value: formatCurrency(totals.total),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {summaryItems.map((item, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
