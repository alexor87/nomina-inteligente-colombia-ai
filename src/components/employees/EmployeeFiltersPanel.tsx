
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { EmployeeFiltersComponent } from './EmployeeFilters';
import { EmployeeFilters } from '@/types/employee-extended';

interface EmployeeFiltersPanelProps {
  showFilters: boolean;
  filters: EmployeeFilters;
  totalEmployees: number;
  filteredCount: number;
  onToggleFilters: () => void;
  onUpdateFilters: (filters: Partial<EmployeeFilters>) => void;
  onClearFilters: () => void;
}

export const EmployeeFiltersPanel = ({
  showFilters,
  filters,
  totalEmployees,
  filteredCount,
  onToggleFilters,
  onUpdateFilters,
  onClearFilters
}: EmployeeFiltersPanelProps) => {
  if (!showFilters) return null;

  return (
    <Card className="shadow-sm border-t-4 border-t-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Filtros Avanzados
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Ocultar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <EmployeeFiltersComponent
          filters={filters}
          onUpdateFilters={onUpdateFilters}
          onClearFilters={onClearFilters}
          totalCount={totalEmployees}
          filteredCount={filteredCount}
        />
      </CardContent>
    </Card>
  );
};
