
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
    <div className="space-y-6">
      <DialogDescription className="text-center text-lg leading-relaxed text-gray-600 px-2">
        {periodStatus.message}
      </DialogDescription>

      {periodStatus.nextPeriod && (
        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-gray-700" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Próximo período</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tipo</span>
              <span className="text-base font-semibold text-gray-900 capitalize">
                {periodStatus.nextPeriod.type}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Fechas</span>
              <span className="text-base font-semibold text-gray-900">
                {new Date(periodStatus.nextPeriod.startDate).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short'
                })} - {new Date(periodStatus.nextPeriod.endDate).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
