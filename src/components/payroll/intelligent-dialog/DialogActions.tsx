
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
import { PeriodStatus } from '@/types/payroll';

interface DialogActionsProps {
  periodStatus: PeriodStatus | null;
  onCreatePeriod: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onDiagnose?: () => Promise<void>;
  isProcessing: boolean;
}

export const DialogActions: React.FC<DialogActionsProps> = ({
  periodStatus,
  onCreatePeriod,
  onRefresh,
  onDiagnose,
  isProcessing
}) => {
  if (!periodStatus) {
    return (
      <div className="flex justify-center">
        <Button variant="outline" onClick={onRefresh} disabled={isProcessing}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center space-x-3">
      {periodStatus.action === 'create' && (
        <Button 
          onClick={onCreatePeriod}
          disabled={isProcessing}
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          {periodStatus.suggestion || 'Crear Período'}
        </Button>
      )}
      
      {periodStatus.action === 'wait' && onDiagnose && (
        <Button 
          onClick={onDiagnose}
          disabled={isProcessing}
          variant="outline"
          className="border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Ejecutar Diagnóstico
        </Button>
      )}
      
      <Button 
        variant="outline" 
        onClick={onRefresh}
        disabled={isProcessing}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Actualizar
      </Button>
    </div>
  );
};
