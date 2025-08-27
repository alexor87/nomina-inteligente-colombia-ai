import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface PeriodSummaryCardsProps {
  periodType: string;
  employeesCount: number;
  totalDevengado: number;
  totalNeto: number;
}

export const PeriodSummaryCards = ({
  periodType,
  employeesCount,
  totalDevengado,
  totalNeto
}: PeriodSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Tipo</div>
          <div className="text-lg font-semibold capitalize">{periodType}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Empleados</div>
          <div className="text-lg font-semibold">{employeesCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Devengado</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(totalDevengado)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Neto</div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(totalNeto)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};