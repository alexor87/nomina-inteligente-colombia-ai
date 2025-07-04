
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PayrollHistoryFilters as Filters } from '@/types/payroll-history';

interface PayrollHistoryFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
}

export const PayrollHistoryFilters = ({ filters, onFiltersChange }: PayrollHistoryFiltersProps) => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({
      dateRange: {
        ...filters.dateRange,
        from: date ? format(date, 'yyyy-MM-dd') : undefined
      }
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({
      dateRange: {
        ...filters.dateRange,
        to: date ? format(date, 'yyyy-MM-dd') : undefined
      }
    });
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({
      dateRange: {},
      status: undefined,
      costCenter: undefined,
      periodType: undefined,
      employeeSearch: undefined
    });
  };

  const hasActiveFilters = () => {
    return !!(filters.status || filters.periodType || filters.dateRange?.from || filters.dateRange?.to);
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda con icono de filtros */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar empleado o período..."
            value={filters.employeeSearch || ''}
            onChange={(e) => onFiltersChange({ employeeSearch: e.target.value || undefined })}
            className="pl-10"
          />
        </div>
        
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              {hasActiveFilters() && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {Object.values(filters).filter(v => v !== undefined && v !== '').length}
                </span>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Rango de fechas */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha desde</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={handleDateFromChange}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha hasta</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={handleDateToChange}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <Select 
                    value={filters.status || 'todos'} 
                    onValueChange={(value) => onFiltersChange({ status: value === 'todos' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                      <SelectItem value="con_errores">Con errores</SelectItem>
                      <SelectItem value="revision">En revisión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de período */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tipo período</label>
                  <Select 
                    value={filters.periodType || 'todos'} 
                    onValueChange={(value) => onFiltersChange({ periodType: value === 'todos' ? undefined : value as 'quincenal' | 'mensual' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botón limpiar filtros */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 invisible">Acciones</label>
                  <Button 
                    variant="outline" 
                    onClick={clearFilters} 
                    className="w-full"
                    disabled={!hasActiveFilters()}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpiar
                  </Button>
                </div>
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
