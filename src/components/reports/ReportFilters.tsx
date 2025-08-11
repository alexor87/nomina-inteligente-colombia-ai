
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReportFilters as ReportFiltersType } from '@/types/reports';
import { ReportsDataService } from '@/services/ReportsDataService';

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
  reportType: string;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  reportType
}) => {
  const [dateFromOpen, setDateFromOpen] = React.useState(false);
  const [dateToOpen, setDateToOpen] = React.useState(false);
  const [periods, setPeriods] = React.useState<Array<{ id: string; label: string }>>([]);
  const [employees, setEmployees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [costCentersData, setCostCentersData] = React.useState<Array<{ code: string; name: string }>>([]);
  const [employeeQuery, setEmployeeQuery] = React.useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = React.useState(false);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const [periodsRes, employeesRes, costCentersRes] = await Promise.all([
          (ReportsDataService as any).getPeriodsForFilters?.() ?? [],
          ReportsDataService.getEmployeesForFilters(),
          ReportsDataService.getCostCentersForFilters(),
        ]);
        if (Array.isArray(periodsRes)) {
          setPeriods(periodsRes.map((p: any) => ({ id: p.id, label: p.label ?? p.period ?? p.periodo ?? '' })).filter((p: any) => p.id && p.label));
        }
        setEmployees(employeesRes);
        setCostCentersData(costCentersRes);
        if (filters.employeeIds?.[0]) {
          const emp = employeesRes.find((e: any) => e.id === filters.employeeIds![0]);
          if (emp) setEmployeeQuery(emp.name);
        }
      } catch (e) {
        console.error('Error loading filter options', e);
      }
    };
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateRangeChange = (field: 'from' | 'to', date: Date | undefined) => {
    if (!date) return;
    
    const dateString = format(date, 'yyyy-MM-dd');
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: dateString
      }
    });
  };

  const handleEmployeeSearch = (value: string) => {
    onFiltersChange({
      ...filters,
      employeeIds: value ? [value] : undefined
    });
  };

  const handleCostCenterChange = (value: string) => {
    const currentCenters = filters.costCenters || [];
    const newCenters = currentCenters.includes(value) 
      ? currentCenters.filter(c => c !== value)
      : [...currentCenters, value];
    
    onFiltersChange({
      ...filters,
      costCenters: newCenters.length > 0 ? newCenters : undefined
    });
  };

  const handleContractTypeChange = (value: string) => {
    const currentTypes = filters.contractTypes || [];
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter(t => t !== value)
      : [...currentTypes, value];
    
    onFiltersChange({
      ...filters,
      contractTypes: newTypes.length > 0 ? newTypes : undefined
    });
  };

  const handleEmployeeStatusChange = (value: string) => {
    const currentStatuses = filters.employeeStatus || [];
    const newStatuses = currentStatuses.includes(value)
      ? currentStatuses.filter(s => s !== value)
      : [...currentStatuses, value];
    
    onFiltersChange({
      ...filters,
      employeeStatus: newStatuses.length > 0 ? newStatuses : undefined
    });
  };

  const handlePeriodChange = (periodId: string) => {
    const selected = periods.find(p => p.id === periodId);
    onFiltersChange({
      ...filters,
      periodId: selected?.id,
      period: selected?.label
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = () => {
    return !!(filters.dateRange?.from || filters.dateRange?.to || 
             filters.employeeIds?.length || filters.costCenters?.length ||
             filters.contractTypes?.length || filters.employeeStatus?.length ||
             filters.noveltyTypes?.length || filters.period || filters.periodId);
  };

  const contractTypes = ['indefinido', 'termino_fijo', 'obra_labor', 'prestacion_servicios'];
  const employeeStatuses = ['activo', 'inactivo', 'vacaciones', 'licencia'];
  const noveltyTypes = ['overtime', 'bonus', 'incapacity', 'license', 'advance', 'absence'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
          {hasActiveFilters() && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Selector */}
        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={filters.periodId || ''} onValueChange={handlePeriodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent className="z-50">
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha desde</Label>
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    format(new Date(filters.dateRange.from), 'dd/MM/yyyy', { locale: es })
                  ) : (
                    <span className="text-muted-foreground">Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange?.from ? new Date(filters.dateRange.from) : undefined}
                  onSelect={(date) => {
                    handleDateRangeChange('from', date);
                    setDateFromOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Fecha hasta</Label>
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.to ? (
                    format(new Date(filters.dateRange.to), 'dd/MM/yyyy', { locale: es })
                  ) : (
                    <span className="text-muted-foreground">Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange?.to ? new Date(filters.dateRange.to) : undefined}
                  onSelect={(date) => {
                    handleDateRangeChange('to', date);
                    setDateToOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Employee Search */}
        <div className="space-y-2 relative">
          <Label>Buscar empleado</Label>
          <Input
            placeholder="Nombre del empleado..."
            value={employeeQuery}
            onChange={(e) => {
              const q = e.target.value;
              setEmployeeQuery(q);
              setShowEmployeeDropdown(!!q);
              if (!q) {
                onFiltersChange({ ...filters, employeeIds: undefined });
              }
            }}
            onFocus={() => setShowEmployeeDropdown(!!employeeQuery)}
          />
          {showEmployeeDropdown && (
            <div className="absolute z-50 w-full bg-popover text-popover-foreground border shadow-md rounded-md mt-1 max-h-60 overflow-auto">
              {employees
                .filter(e => e.name.toLowerCase().includes(employeeQuery.toLowerCase()))
                .slice(0, 8)
                .map(e => (
                  <div
                    key={e.id}
                    className="px-3 py-2 cursor-pointer hover:bg-accent"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => {
                      onFiltersChange({ ...filters, employeeIds: [e.id] });
                      setEmployeeQuery(e.name);
                      setShowEmployeeDropdown(false);
                    }}
                  >
                    {e.name}
                  </div>
                ))}
              {employees.filter(e => e.name.toLowerCase().includes(employeeQuery.toLowerCase())).length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
              )}
            </div>
          )}
        </div>

        {/* Cost Centers */}
        <div className="space-y-2">
          <Label>Centros de costo</Label>
          <div className="flex flex-wrap gap-2">
            {costCentersData.map((cc) => (
              <Badge
                key={cc.code}
                variant={filters.costCenters?.includes(cc.name) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleCostCenterChange(cc.name)}
              >
                {cc.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Contract Types */}
        <div className="space-y-2">
          <Label>Tipos de contrato</Label>
          <div className="flex flex-wrap gap-2">
            {contractTypes.map((type) => (
              <Badge
                key={type}
                variant={filters.contractTypes?.includes(type) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleContractTypeChange(type)}
              >
                {type.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Employee Status */}
        <div className="space-y-2">
          <Label>Estado del empleado</Label>
          <div className="flex flex-wrap gap-2">
            {employeeStatuses.map((status) => (
              <Badge
                key={status}
                variant={filters.employeeStatus?.includes(status) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleEmployeeStatusChange(status)}
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters() && (
          <div className="pt-2 border-t">
            <div className="text-sm text-gray-600 mb-2">Filtros activos:</div>
            <div className="flex flex-wrap gap-1">
              {filters.dateRange?.from && (
                <Badge variant="secondary" className="text-xs">
                  Desde: {format(new Date(filters.dateRange.from), 'dd/MM/yyyy')}
                </Badge>
              )}
              {filters.dateRange?.to && (
                <Badge variant="secondary" className="text-xs">
                  Hasta: {format(new Date(filters.dateRange.to), 'dd/MM/yyyy')}
                </Badge>
              )}
              {filters.employeeIds?.map(id => (
                <Badge key={id} variant="secondary" className="text-xs">
                  Empleado: {id}
                </Badge>
              ))}
              {filters.costCenters?.map(center => (
                <Badge key={center} variant="secondary" className="text-xs">
                  Centro: {center}
                </Badge>
              ))}
              {filters.contractTypes?.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  Contrato: {type}
                </Badge>
              ))}
              {filters.employeeStatus?.map(status => (
                <Badge key={status} variant="secondary" className="text-xs">
                  Estado: {status}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
