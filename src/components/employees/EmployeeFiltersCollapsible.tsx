
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmployeeFilters } from '@/types/employee-extended';
import { ESTADOS_EMPLEADO, CENTROS_COSTO } from '@/types/employee-extended';
import { CONTRACT_TYPES, ARL_RISK_LEVELS } from '@/types/employee-config';
import { X } from 'lucide-react';

interface EmployeeFiltersCollapsibleProps {
  filters: EmployeeFilters;
  onUpdateFilters: (filters: Partial<EmployeeFilters>) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export const EmployeeFiltersCollapsible = ({ 
  filters, 
  onUpdateFilters, 
  onClearFilters, 
  totalCount, 
  filteredCount 
}: EmployeeFiltersCollapsibleProps) => {
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== '' && value !== undefined
  ).length;

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header con contador y botón limpiar */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {filteredCount} de {totalCount} empleados
            </span>
            {activeFiltersCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Filtros en grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Estado</label>
              <Select 
                value={filters.estado || 'all'} 
                onValueChange={(value) => onUpdateFilters({ estado: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS_EMPLEADO.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Contrato</label>
              <Select 
                value={filters.tipoContrato || 'all'} 
                onValueChange={(value) => onUpdateFilters({ tipoContrato: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los contratos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los contratos</SelectItem>
                  {CONTRACT_TYPES.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Centro de Costo</label>
              <Select 
                value={filters.centroCosto || 'all'} 
                onValueChange={(value) => onUpdateFilters({ centroCosto: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {CENTROS_COSTO.map((centro) => (
                    <SelectItem key={centro} value={centro}>
                      {centro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nivel Riesgo ARL</label>
              <Select 
                value={filters.nivelRiesgoARL || 'all'} 
                onValueChange={(value) => onUpdateFilters({ nivelRiesgoARL: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los niveles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  {ARL_RISK_LEVELS.map((nivel) => (
                    <SelectItem key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtros de fecha */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Fecha ingreso desde</label>
              <Input
                type="date"
                value={filters.fechaIngresoInicio || ''}
                onChange={(e) => onUpdateFilters({ fechaIngresoInicio: e.target.value || undefined })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Fecha ingreso hasta</label>
              <Input
                type="date"
                value={filters.fechaIngresoFin || ''}
                onChange={(e) => onUpdateFilters({ fechaIngresoFin: e.target.value || undefined })}
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="afiliacionIncompleta"
                checked={filters.afiliacionIncompleta === true}
                onChange={(e) => onUpdateFilters({ 
                  afiliacionIncompleta: e.target.checked ? true : undefined 
                })}
                className="rounded border-gray-300"
              />
              <label htmlFor="afiliacionIncompleta" className="text-sm text-gray-700">
                Solo afiliación incompleta
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
