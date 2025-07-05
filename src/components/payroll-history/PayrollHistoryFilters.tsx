
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Filter, X } from 'lucide-react';
import { PayrollHistoryFilters as FilterType } from '@/types/payroll-history';

interface PayrollHistoryFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: Partial<FilterType>) => void;
}

/**
 * ✅ FILTROS DE HISTORIAL - FASE 2 REPARACIÓN CRÍTICA
 * Filtros funcionales para el historial de nómina
 */
export const PayrollHistoryFilters: React.FC<PayrollHistoryFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const hasActiveFilters = Boolean(
    filters.status || 
    filters.periodType || 
    filters.dateRange.from || 
    filters.dateRange.to ||
    filters.employeeSearch
  );

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: {},
      status: '',
      periodType: undefined,
      employeeSearch: ''
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Filtrar períodos</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="ml-auto text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro por Estado */}
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="text-xs font-medium text-gray-700">
              Estado
            </Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => onFiltersChange({ status: value || '' })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
                <SelectItem value="con_errores">Con Errores</SelectItem>
                <SelectItem value="editado">Editado</SelectItem>
                <SelectItem value="reabierto">Reabierto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Tipo de Período */}
          <div className="space-y-2">
            <Label htmlFor="period-type-filter" className="text-xs font-medium text-gray-700">
              Tipo de Período
            </Label>
            <Select
              value={filters.periodType || ''}
              onValueChange={(value) => onFiltersChange({ 
                periodType: value ? value as 'semanal' | 'quincenal' | 'mensual' | 'personalizado' : undefined 
              })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los tipos</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha Desde */}
          <div className="space-y-2">
            <Label htmlFor="date-from" className="text-xs font-medium text-gray-700">
              Desde
            </Label>
            <div className="relative">
              <Input
                id="date-from"
                type="date"
                value={filters.dateRange.from || ''}
                onChange={(e) => onFiltersChange({ 
                  dateRange: { ...filters.dateRange, from: e.target.value }
                })}
                className="h-8 text-xs pr-8"
              />
              <Calendar className="absolute right-2 top-2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-2">
            <Label htmlFor="date-to" className="text-xs font-medium text-gray-700">
              Hasta
            </Label>
            <div className="relative">
              <Input
                id="date-to"
                type="date"
                value={filters.dateRange.to || ''}
                onChange={(e) => onFiltersChange({ 
                  dateRange: { ...filters.dateRange, to: e.target.value }
                })}
                className="h-8 text-xs pr-8"
              />
              <Calendar className="absolute right-2 top-2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Búsqueda de Empleados */}
        <div className="mt-4">
          <Label htmlFor="employee-search" className="text-xs font-medium text-gray-700 mb-2 block">
            Buscar empleado
          </Label>
          <Input
            id="employee-search"
            type="text"
            placeholder="Nombre del empleado..."
            value={filters.employeeSearch || ''}
            onChange={(e) => onFiltersChange({ employeeSearch: e.target.value })}
            className="h-8 text-xs max-w-sm"
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Filtros activos: {[
                filters.status && `Estado: ${filters.status}`,
                filters.periodType && `Tipo: ${filters.periodType}`,
                filters.dateRange.from && `Desde: ${filters.dateRange.from}`,
                filters.dateRange.to && `Hasta: ${filters.dateRange.to}`,
                filters.employeeSearch && `Empleado: ${filters.employeeSearch}`
              ].filter(Boolean).join(' • ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
