
import React from 'react';
import { Calendar, Users, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PeriodStatus, PeriodStatusInfo } from '@/types/payroll';

interface PeriodInfoProps {
  periodStatus: PeriodStatus | null;
}

const isPeriodStatusInfo = (status: PeriodStatus): status is PeriodStatusInfo => {
  return typeof status === 'object' && status !== null && 'status' in status;
};

export const PeriodInfo: React.FC<PeriodInfoProps> = ({ periodStatus }) => {
  const statusInfo = periodStatus && isPeriodStatusInfo(periodStatus) ? periodStatus : null;
  
  if (!statusInfo?.currentPeriod && !statusInfo?.nextPeriod) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-gray-500">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay información de período disponible</p>
        </CardContent>
      </Card>
    );
  }

  const period = statusInfo.currentPeriod || statusInfo.nextPeriod;
  const isExisting = !!statusInfo.currentPeriod;

  return (
    <Card className={isExisting ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="font-medium">
              {period?.periodo || period?.periodName}
            </span>
          </div>
          
          {(period?.fecha_inicio || period?.startDate) && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Fechas:</span>
              <span>
                {period.fecha_inicio || period.startDate} - {period.fecha_fin || period.endDate}
              </span>
            </div>
          )}
          
          {period?.empleados_count && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{period.empleados_count} empleados</span>
            </div>
          )}
          
          {period?.total_neto && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <DollarSign className="h-4 w-4" />
              <span>Total: ${period.total_neto.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
