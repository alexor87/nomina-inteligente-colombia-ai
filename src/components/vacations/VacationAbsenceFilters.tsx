
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VacationAbsenceFilters, getVacationAbsenceTypes, ABSENCE_TYPE_LABELS } from '@/types/vacations';
import { Filter, X } from 'lucide-react';

interface VacationAbsenceFiltersComponentProps {
  filters: VacationAbsenceFilters;
  onFiltersChange: (filters: VacationAbsenceFilters) => void;
  onClearFilters: () => void;
}

export const VacationAbsenceFiltersComponent = ({
  filters,
  onFiltersChange,
  onClearFilters
}: VacationAbsenceFiltersComponentProps) => {
  const [localFilters, setLocalFilters] = useState<VacationAbsenceFilters>(filters);

  const handleFilterChange = (key: keyof VacationAbsenceFilters, value: string) => {
    const newFilters = {
      ...localFilters,
      [key]: value || undefined
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const availableTypes = getVacationAbsenceTypes();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro por tipo */}
          <div className="space-y-2">
            <Label>Tipo de Ausencia</Label>
            <Select
              value={localFilters.type || ''}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los tipos</SelectItem>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ABSENCE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por estado */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={localFilters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="liquidada">Liquidada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Búsqueda de empleado */}
          <div className="space-y-2">
            <Label>Buscar Empleado</Label>
            <Input
              placeholder="Nombre, apellido o cédula..."
              value={localFilters.employee_search || ''}
              onChange={(e) => handleFilterChange('employee_search', e.target.value)}
            />
          </div>

          {/* Fecha desde */}
          <div className="space-y-2">
            <Label>Fecha Desde</Label>
            <Input
              type="date"
              value={localFilters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fecha hasta */}
          <div className="space-y-2">
            <Label>Fecha Hasta</Label>
            <Input
              type="date"
              value={localFilters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>
        </div>

        {/* Botón para limpiar filtros */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Limpiar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
