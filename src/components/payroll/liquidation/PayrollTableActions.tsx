
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RefreshCw, Save, Lock, Users, Filter, Download, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    <Card className="mx-6 mb-4 p-4 bg-white border shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Empleados para Liquidación</h2>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Users className="h-3 w-3 mr-1" />
                {employeeCount} empleados
              </Badge>
              
              {validEmployeeCount > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {validEmployeeCount} válidos
                </Badge>
              )}
              
              {errorCount > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {errorCount} con errores
                </Badge>
              )}
            </div>
          </div>

          {!canEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 px-3 py-1">
                    <Lock className="h-3 w-3 mr-2" />
                    Solo lectura
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>El período no está en estado borrador. Los valores no se pueden editar.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Filter Toggle */}
          {errorCount > 0 && onToggleErrorFilter && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showOnlyErrors ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleErrorFilter}
                    className={showOnlyErrors ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {showOnlyErrors ? (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Solo errores ({errorCount})
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Ver errores
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showOnlyErrors ? 'Mostrar todos los empleados' : 'Mostrar solo empleados con errores'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Export Button */}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}

          {/* Recalculate Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRecalculate}
            disabled={!canEdit || isLoading}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Recalcular todos
          </Button>

          {/* Auto Save Indicator */}
          <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
            {canEdit ? (
              <>
                <Save className="h-4 w-4 mr-2 text-green-600" />
                <span>Guardado automático</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2 text-gray-500" />
                <span>Período bloqueado</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
