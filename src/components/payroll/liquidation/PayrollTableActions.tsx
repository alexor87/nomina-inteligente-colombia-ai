
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Filter, Download, AlertCircle } from 'lucide-react';

interface PayrollTableActionsProps {
  employeeCount: number;
  validEmployeeCount: number;
  onRecalculate: () => void;
  isLoading: boolean;
  canEdit: boolean;
  showOnlyErrors?: boolean;
  onToggleErrorFilter?: () => void;
  onExport?: () => void;
}

export const PayrollTableActions = ({
  employeeCount,
  validEmployeeCount,
  onRecalculate,
  isLoading,
  canEdit,
  showOnlyErrors = false,
  onToggleErrorFilter,
  onExport
}: PayrollTableActionsProps) => {
  const errorCount = employeeCount - validEmployeeCount;

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-medium text-gray-900">Empleados</h2>
        
        {errorCount > 0 && (
          <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errorCount} con errores
          </Badge>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Error filter */}
        {errorCount > 0 && onToggleErrorFilter && (
          <Button
            variant={showOnlyErrors ? "default" : "ghost"}
            size="sm"
            onClick={onToggleErrorFilter}
            className={showOnlyErrors ? "bg-red-600 hover:bg-red-700 text-white" : "text-gray-600"}
          >
            <Filter className="h-4 w-4 mr-1" />
            {showOnlyErrors ? `Solo errores (${errorCount})` : 'Ver errores'}
          </Button>
        )}

        {/* Export */}
        {onExport && (
          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        )}

        {/* Recalculate */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRecalculate}
          disabled={!canEdit || isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Recalcular
        </Button>
      </div>
    </div>
  );
};
