
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Lock, CheckCircle } from 'lucide-react';

interface PayrollActionsProps {
  canClosePeriod: boolean;
  isProcessing: boolean;
  onClosePeriod: () => Promise<void>;
  onRecalculateAll: () => Promise<void>;
  selectedCount: number;
  totalCount: number;
}

export const PayrollActions = ({ 
  canClosePeriod,
  isProcessing,
  onClosePeriod,
  onRecalculateAll,
  selectedCount,
  totalCount
}: PayrollActionsProps) => {
  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRecalculateAll}
          disabled={isProcessing}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalcular todos
        </Button>

        <div className="flex items-center text-sm text-gray-600">
          <Save className="h-4 w-4 mr-1" />
          Guardado automático
        </div>

        <div className="text-sm text-gray-500">
          {selectedCount}/{totalCount} empleados seleccionados
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {canClosePeriod && (
          <Button
            onClick={onClosePeriod}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Cerrar Período
          </Button>
        )}
      </div>
    </div>
  );
};
