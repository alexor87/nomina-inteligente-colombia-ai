
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmployeeFilters } from '@/types/employee-extended';
import { ESTADOS_EMPLEADO, CENTROS_COSTO } from '@/types/employee-extended';
import { CONTRACT_TYPES, ARL_RISK_LEVELS } from '@/types/employee-config';
import { Search, Filter, X } from 'lucide-react';

interface EmployeeFiltersProps {
  filters: EmployeeFilters;
  onUpdateFilters: (filters: Partial<EmployeeFilters>) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export const EmployeeFiltersComponent = ({ 
  filters, 
  onUpdateFilters, 
  onClearFilters, 
  totalCount, 
  filteredCount 
}: EmployeeFiltersProps) => {
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== '' && value !== undefined
  ).length;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Barra de búsqueda principal */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, documento, correo, cargo o centro de costo..."
              value={filters.searchTerm}
              onChange={(e) => onUpdateFilters({ searchTerm: e.target.value })}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {filteredCount} de {totalCount} empleados
            </span>
          </div>
        </div>

        {/* Filtros avanzados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Estado</label>
            <Select 
              value={filters.estado || ''} 
              onValueChange={(value) => onUpdateFilters({ estado: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
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
              value={filters.tipoContrato || ''} 
              onValueChange={(value) => onUpdateFilters({ tipoContrato: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los contratos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los contratos</SelectItem>
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
              value={filters.centroCosto || ''} 
              onValueChange={(value) => onUpdateFilters({ centroCosto: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los centros</SelectItem>
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
              value={filters.nivelRiesgoARL || ''} 
              onValueChange={(value) => onUpdateFilters({ nivelRiesgoARL: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los niveles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los niveles</SelectItem>
                {ARL_RISK_LEVELS.map((nivel) => (
                  <SelectItem key={nivel.value} value={nivel.value}>
                    {nivel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros de fecha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Afiliación</label>
            <Select 
              value={filters.afiliacionIncompleta === undefined ? '' : filters.afiliacionIncompleta.toString()} 
              onValueChange={(value) => 
                onUpdateFilters({ 
                  afiliacionIncompleta: value === '' ? undefined : value === 'true' 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las afiliaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las afiliaciones</SelectItem>
                <SelectItem value="false">Solo afiliaciones completas</SelectItem>
                <SelectItem value="true">Solo afiliaciones incompletas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros activos y botón limpiar */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filtros activos:</span>
              <Badge variant="secondary">
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearFilters}
              className="flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Limpiar filtros</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
