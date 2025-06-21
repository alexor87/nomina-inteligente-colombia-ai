
import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw, Eye, EyeOff, Save } from 'lucide-react';

interface PayrollActionsProps {
  isValid: boolean;
  onApprove: () => void;
  onRecalculate: () => void;
  onToggleSummary: () => void;
  showSummary: boolean;
}

export const PayrollActions = ({ 
  isValid, 
  onApprove, 
  onRecalculate, 
  onToggleSummary,
  showSummary 
}: PayrollActionsProps) => {
  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRecalculate}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalcular todos
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSummary}
        >
          {showSummary ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Ocultar resumen
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Mostrar resumen
            </>
          )}
        </Button>

        <div className="flex items-center text-sm text-gray-600">
          <Save className="h-4 w-4 mr-1" />
          Guardado automático
        </div>
      </div>

      {isValid && (
        <Button
          onClick={onApprove}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Aprobar y cerrar período
        </Button>
      )}
    </div>
  );
};
