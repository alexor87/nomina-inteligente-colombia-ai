
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, Save, Star } from 'lucide-react';
import { useReports } from '@/hooks/useReports';

export const ReportsFilters = () => {
  const { filters, setFilters, savedFilters, saveFilter, applyFilter, activeReportType } = useReports();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setFilters({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value
      }
    });
  };

  const handleSaveFilter = async () => {
    if (filterName.trim()) {
      await saveFilter(filterName, activeReportType);
      setFilterName('');
      setShowSaveDialog(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(!showSaveDialog)}>
              <Save className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros guardados */}
        {savedFilters.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700">Filtros guardados</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {savedFilters.map((filter) => (
                <Badge 
                  key={filter.id}
                  variant="outline" 
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => applyFilter(filter)}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {filter.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Diálogo para guardar filtro */}
        {showSaveDialog && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Nombre del filtro"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSaveFilter}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Rango de fechas */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Fecha desde</span>
            </Label>
            <Input
              type="date"
              value={filters.dateRange?.from || ''}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha hasta</Label>
            <Input
              type="date"
              value={filters.dateRange?.to || ''}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
            />
          </div>

          {/* Centro de costo */}
          <div className="space-y-2">
            <Label>Centro de costo</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos los centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                <SelectItem value="admin">Administración</SelectItem>
                <SelectItem value="sales">Ventas</SelectItem>
                <SelectItem value="operations">Operaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado del empleado */}
          <div className="space-y-2">
            <Label>Estado empleado</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Retirado</SelectItem>
                <SelectItem value="vacation">Vacaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Buscador de empleados */}
        <div className="space-y-2">
          <Label>Buscar empleado</Label>
          <Input 
            placeholder="Nombre, cédula o email del empleado..."
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};
