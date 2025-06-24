
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { VoucherFilters } from '@/types/vouchers';
import { Search, X, Filter } from 'lucide-react';

interface VoucherFiltersComponentProps {
  filters: VoucherFilters;
  onUpdateFilters: (filters: Partial<VoucherFilters>) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export const VoucherFiltersComponent = ({
  filters,
  onUpdateFilters,
  onClearFilters,
  totalCount,
  filteredCount
}: VoucherFiltersComponentProps) => {
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== '' && value !== undefined
  ).length;

  return (
    <Card className="p-4 space-y-4">
      {/* Barra de búsqueda principal */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por empleado, cédula o período..."
            value={filters.searchTerm}
            onChange={(e) => onUpdateFilters({ searchTerm: e.target.value })}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={onClearFilters}
          disabled={activeFiltersCount === 0}
          className="shrink-0"
        >
          <X className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>

      {/* Filtros específicos */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
        </div>

        <Select
          value={filters.voucherStatus}
          onValueChange={(value) => onUpdateFilters({ voucherStatus: value === 'all' ? '' : value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="generado">Generado</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sentToEmployee === undefined ? 'all' : filters.sentToEmployee.toString()}
          onValueChange={(value) => onUpdateFilters({ 
            sentToEmployee: value === 'all' ? undefined : value === 'true' 
          })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Enviado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Enviados</SelectItem>
            <SelectItem value="false">Sin enviar</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="Fecha desde"
          value={filters.startDate}
          onChange={(e) => onUpdateFilters({ startDate: e.target.value })}
          className="w-40"
        />

        <Input
          type="date"
          placeholder="Fecha hasta"
          value={filters.endDate}
          onChange={(e) => onUpdateFilters({ endDate: e.target.value })}
          className="w-40"
        />
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>
            Mostrando <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> comprobantes
          </span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
