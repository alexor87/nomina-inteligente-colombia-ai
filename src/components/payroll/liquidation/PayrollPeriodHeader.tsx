
import React from 'react';
import { CalendarDays, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PeriodStatus, PeriodStatusInfo } from '@/types/payroll';

interface PayrollPeriodHeaderProps {
  periodStatus: PeriodStatus | null;
  employeeCount: number;
  totalNetPay: number;
}

const isPeriodStatusInfo = (status: PeriodStatus): status is PeriodStatusInfo => {
  return typeof status === 'object' && status !== null && 'status' in status;
};

export const PayrollPeriodHeader: React.FC<PayrollPeriodHeaderProps> = ({
  periodStatus,
  employeeCount,
  totalNetPay
}) => {
  const statusInfo = periodStatus && isPeriodStatusInfo(periodStatus) ? periodStatus : null;
  const currentPeriod = statusInfo?.currentPeriod;
  const status = statusInfo?.status || (typeof periodStatus === 'string' ? periodStatus : 'borrador');

  const getStatusBadge = (status: string) => {
    const variants = {
      'borrador': { variant: 'secondary' as const, label: 'Borrador' },
      'cerrado': { variant: 'default' as const, label: 'Cerrado' },
      'procesada': { variant: 'default' as const, label: 'Procesada' },
      'pagada': { variant: 'default' as const, label: 'Pagada' },
      'con_errores': { variant: 'destructive' as const, label: 'Con Errores' }
    };
    
    return variants[status as keyof typeof variants] || { variant: 'secondary' as const, label: status };
  };

  const statusBadge = getStatusBadge(status);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {currentPeriod?.periodo || 'Período de Liquidación'}
            </CardTitle>
            {currentPeriod && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentPeriod.fecha_inicio} - {currentPeriod.fecha_fin}
              </p>
            )}
          </div>
          <Badge {...statusBadge}>{statusBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Empleados</p>
              <p className="text-2xl font-bold">{employeeCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Neto</p>
              <p className="text-2xl font-bold">${totalNetPay.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="text-lg font-medium">{statusBadge.label}</p>
            </div>
          </div>
        </div>

        {statusInfo?.message && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">{statusInfo.message}</p>
          </div>
        )}

        {statusInfo?.suggestion && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              <strong>Sugerencia:</strong> {statusInfo.suggestion}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
