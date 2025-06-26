
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
    <div className="space-y-5">
      {/* Description */}
      <DialogDescription className="text-center text-base leading-relaxed text-gray-600">
        {periodStatus.message}
      </DialogDescription>

      {/* Next Period Info */}
      {periodStatus.nextPeriod && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-white rounded-md shadow-sm">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Próximo período</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tipo
              </span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {periodStatus.nextPeriod.type}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fechas
              </span>
              <span className="text-sm font-medium text-gray-900">
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
