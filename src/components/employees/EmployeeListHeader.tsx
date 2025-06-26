
import { Button } from '@/components/ui/button';
import { Plus, Filter, Upload, Download, Loader2 } from 'lucide-react';

interface EmployeeListHeaderProps {
  filteredCount: number;
  totalEmployees: number;
  searchTerm: string;
  isSupportMode: boolean;
  showFilters: boolean;
  isExporting: boolean;
  employeeCount: number;
  onToggleFilters: () => void;
  onOpenImport: () => void;
  onExportToExcel: () => void;
  onCreateEmployee: () => void;
}

export const EmployeeListHeader = ({
  filteredCount,
  totalEmployees,
  searchTerm,
  isSupportMode,
  showFilters,
  isExporting,
  employeeCount,
  onToggleFilters,
  onOpenImport,
  onExportToExcel,
  onCreateEmployee
}: EmployeeListHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
        <p className="text-gray-600">
          {filteredCount} de {totalEmployees} empleados
          {searchTerm && ` - Filtrado por: "${searchTerm}"`}
          {isSupportMode && " (Vista de Soporte)"}
        </p>
      </div>
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onToggleFilters}>
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
        <Button variant="outline" onClick={onOpenImport}>
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
        <Button 
          variant="outline" 
          onClick={onExportToExcel}
          disabled={isExporting || employeeCount === 0}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? 'Exportando...' : 'Exportar'}
        </Button>
        <Button onClick={onCreateEmployee}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>
    </div>
  );
};
