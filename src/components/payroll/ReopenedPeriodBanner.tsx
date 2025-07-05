
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { formatPeriodDateRange } from '@/utils/periodDateUtils';

interface ReopenedPeriodBannerProps {
  periodName: string;
  startDate: string;
  endDate: string;
  onFinishEditing: () => void;
  onDismiss: () => void;
}

export const ReopenedPeriodBanner = ({
  periodName,
  startDate,
  endDate,
  onFinishEditing,
  onDismiss
}: ReopenedPeriodBannerProps) => {
  const formattedPeriod = formatPeriodDateRange(startDate, endDate);

  return (
    <Alert className="bg-amber-50 border-amber-200 mb-6">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <div>
            <span className="font-medium text-amber-900">
              Estás editando un periodo reabierto: {formattedPeriod}
            </span>
            <div className="text-sm text-amber-700 mt-1">
              Recuerda cerrar el periodo nuevamente cuando termines. Todas las modificaciones quedan registradas.
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onFinishEditing}
            className="bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
          >
            Finalizar Edición
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-amber-600 hover:text-amber-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
