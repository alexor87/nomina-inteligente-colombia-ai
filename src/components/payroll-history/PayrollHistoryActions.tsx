
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PayrollHistoryActionsProps {
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing?: boolean;
  canCreatePeriod?: boolean;
}

export const PayrollHistoryActions: React.FC<PayrollHistoryActionsProps> = ({
  onRefresh,
  onExport,
  isRefreshing = false,
  canCreatePeriod = true
}) => {
  const navigate = useNavigate();

  const handleCreatePeriod = () => {
    navigate('/app/payroll');
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onRefresh}
        variant="outline"
        size="sm"
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Actualizar
      </Button>
      
      <Button
        onClick={onExport}
        variant="outline"
        size="sm"
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
      
      {canCreatePeriod && (
        <Button
          onClick={handleCreatePeriod}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Período
        </Button>
      )}
    </div>
  );
};
