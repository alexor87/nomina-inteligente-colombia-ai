
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
  estado: string;
  total_neto: number;
  empleados_count: number;
}

interface PayrollPeriodGuardProps {
  periods: PayrollPeriod[];
  onCleanupEmptyDrafts?: () => Promise<void>;
  hideZeroNetPeriods?: boolean;
  onToggleZeroNetFilter?: (hide: boolean) => void;
}

export const PayrollPeriodGuard: React.FC<PayrollPeriodGuardProps> = ({
  periods,
  onCleanupEmptyDrafts,
  hideZeroNetPeriods = false,
  onToggleZeroNetFilter
}) => {
  // Detectar períodos problemáticos
  const emptyDrafts = periods.filter(p => 
    p.estado === 'borrador' && 
    (p.total_neto === 0 || p.empleados_count === 0)
  );
  
  const duplicates = periods.reduce((acc, period) => {
    const key = `${period.fecha_inicio}-${period.fecha_fin}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(period);
    return acc;
  }, {} as Record<string, PayrollPeriod[]>);
  
  const duplicateGroups = Object.values(duplicates).filter(group => group.length > 1);

  const getPeriodBadge = (period: PayrollPeriod) => {
    if (period.tipo_periodo === 'quincenal') {
      return (
        <Badge variant="outline" className="text-blue-700 border-blue-300">
          Quincenal
        </Badge>
      );
    }
    if (period.tipo_periodo === 'personalizado') {
      return (
        <Badge variant="outline" className="text-purple-700 border-purple-300">
          Personalizado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-700 border-gray-300">
        {period.tipo_periodo}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filtro para ocultar períodos con $0 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideZeroNetPeriods}
              onChange={(e) => onToggleZeroNetFilter?.(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Ocultar períodos con Total Neto $0
            </span>
          </label>
        </div>
        
        {emptyDrafts.length > 0 && onCleanupEmptyDrafts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCleanupEmptyDrafts}
            className="text-red-700 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Borradores Vacíos ({emptyDrafts.length})
          </Button>
        )}
      </div>

      {/* Alertas de períodos problemáticos */}
      {emptyDrafts.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Borradores vacíos detectados:</strong> {emptyDrafts.length} períodos en estado borrador con total neto $0 o sin empleados.
            <div className="mt-2 space-y-1">
              {emptyDrafts.slice(0, 3).map(period => (
                <div key={period.id} className="flex items-center justify-between text-sm">
                  <span>{period.periodo}</span>
                  {getPeriodBadge(period)}
                </div>
              ))}
              {emptyDrafts.length > 3 && (
                <div className="text-sm text-amber-700">
                  ... y {emptyDrafts.length - 3} más
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {duplicateGroups.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Períodos duplicados detectados:</strong> {duplicateGroups.length} grupos con fechas idénticas.
            <div className="mt-2 space-y-2">
              {duplicateGroups.slice(0, 2).map((group, index) => (
                <div key={index} className="space-y-1">
                  <div className="font-medium">
                    {group[0].fecha_inicio} - {group[0].fecha_fin}:
                  </div>
                  {group.map(period => (
                    <div key={period.id} className="flex items-center justify-between text-sm ml-4">
                      <span>{period.periodo} ({period.estado})</span>
                      <div className="flex items-center space-x-2">
                        {getPeriodBadge(period)}
                        <span className="text-xs">
                          {formatCurrency(period.total_neto)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
