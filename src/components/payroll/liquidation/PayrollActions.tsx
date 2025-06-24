
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Lock } from 'lucide-react';

interface PayrollActionsProps {
  onRecalculate: () => void;
  onToggleSummary: () => void;
  showSummary: boolean;
  canEdit?: boolean;
}

export const PayrollActions = ({ 
  onRecalculate,
  canEdit = true
}: PayrollActionsProps) => {
  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRecalculate}
          disabled={!canEdit}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalcular todos
        </Button>

        <div className="flex items-center text-sm text-gray-600">
          {canEdit ? (
            <>
              <Save className="h-4 w-4 mr-1" />
              Guardado automático
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-1" />
              Período bloqueado para edición
            </>
          )}
        </div>
      </div>
    </div>
  );
};
