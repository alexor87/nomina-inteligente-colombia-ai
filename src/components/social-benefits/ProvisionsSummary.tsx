
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  totals: {
    count: number;
    total: number;
    byType: {
      cesantias: number;
      intereses_cesantias: number;
      prima: number;
      vacaciones: number;
    }
  }
};

const formatCurrency = (v: number) =>
  v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const ProvisionsSummary: React.FC<Props> = ({ totals }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Registros</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{totals.count}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Cesantías</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{formatCurrency(totals.byType.cesantias)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Intereses</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{formatCurrency(totals.byType.intereses_cesantias)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Prima</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{formatCurrency(totals.byType.prima)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Vacaciones</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{formatCurrency(totals.byType.vacaciones)}</div>
        </CardContent>
      </Card>
    </div>
  );
};
