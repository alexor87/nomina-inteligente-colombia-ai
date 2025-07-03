
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { UnifiedPeriodStatus } from '@/types/period-unified';

interface NoActivePeriodStateProps {
  periodStatus: UnifiedPeriodStatus | null;
  onCreatePeriod: () => void;
  onRefresh: () => void;
  isProcessing: boolean;
}

export const NoActivePeriodState: React.FC<NoActivePeriodStateProps> = ({
  periodStatus,
  onCreatePeriod,
  onRefresh,
  isProcessing
}) => {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Card className="p-8 text-center max-w-md">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay período activo
            </h3>
            <p className="text-gray-600">
              {periodStatus?.message || 'No hay períodos de nómina activos para procesar'}
            </p>
          </div>

          {periodStatus?.nextPeriod && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Período sugerido:</h4>
              <p className="text-blue-700 font-semibold">
                {periodStatus.nextPeriod.period}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {periodStatus.nextPeriod.startDate} - {periodStatus.nextPeriod.endDate}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {periodStatus?.action === 'create' && (
              <Button 
                onClick={onCreatePeriod}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Período
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={onRefresh}
              disabled={isProcessing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
