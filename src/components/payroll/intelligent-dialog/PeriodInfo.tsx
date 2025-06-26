
import React from 'react';
import { Calendar } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';

interface PeriodInfoProps {
  periodStatus: PeriodStatus;
}

export const PeriodInfo: React.FC<PeriodInfoProps> = ({
  periodStatus
}) => {
  return (
    <div className="py-4">
      <DialogDescription className="text-center text-base leading-relaxed">
        {periodStatus.message}
      </DialogDescription>

      {periodStatus.nextPeriod && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-900">Próximo periodo</span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Tipo:</span> {periodStatus.nextPeriod.type}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Fechas:</span>{' '}
            {new Date(periodStatus.nextPeriod.startDate).toLocaleDateString('es-CO')} -{' '}
            {new Date(periodStatus.nextPeriod.endDate).toLocaleDateString('es-CO')}
          </div>
        </div>
      )}
    </div>
  );
};
