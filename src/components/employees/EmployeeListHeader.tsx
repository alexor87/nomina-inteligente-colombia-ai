
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Upload, 
  Download, 
  Filter, 
  RefreshCw,
  Trash2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { DataCleanupDialog } from './DataCleanupDialog';

interface EmployeeListHeaderProps {
  filteredCount: number;
  totalEmployees: number;
  searchTerm: string;
  isSupportMode?: boolean;
  showFilters: boolean;
  isExporting: boolean;
  employeeCount: number;
  onToggleFilters: () => void;
  onOpenImport: () => void;
  onExportToExcel: () => void;
  onCreateEmployee: () => void;
  onRefreshData?: () => void;
  onForceCompleteRefresh?: () => void;
}

export const EmployeeListHeader: React.FC<EmployeeListHeaderProps> = ({
  filteredCount,
  totalEmployees,
  searchTerm,
  isSupportMode = false,
  showFilters,
  isExporting,
  employeeCount,
  onToggleFilters,
  onOpenImport,
  onExportToExcel,
  onCreateEmployee,
  onRefreshData,
  onForceCompleteRefresh
}) => {
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);

  const getEmployeeCountText = () => {
    if (searchTerm && filteredCount !== totalEmployees) {
      return `${filteredCount} de ${totalEmployees} empleados`;
    }
    return `${totalEmployees} empleado${totalEmployees !== 1 ? 's' : ''}`;
  };

  const handleRefresh = () => {
    if (onRefreshData) {
      onRefreshData();
    }
  };

  const handleForceRefresh = () => {
    if (onForceCompleteRefresh) {
      onForceCompleteRefresh();
    }
  };

  const handleCleanupComplete = () => {
    if (onForceCompleteRefresh) {
      onForceCompleteRefresh();
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Empleados
            </h1>
            <p className="text-sm text-gray-600">
              {getEmployeeCountText()}
            </p>
          </div>
          {isSupportMode && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Modo Soporte
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de refresh normal */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>

          {/* Botón de refresh completo */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceRefresh}
            className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <Zap className="h-4 w-4" />
            Recarga Total
          </Button>

          {/* Botón de limpieza completa (solo para soporte) */}
          {isSupportMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCleanupDialogOpen(true)}
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar Cuenta
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleFilters}
            className={`flex items-center gap-2 ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-300' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenImport}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExportToExcel}
            disabled={isExporting || employeeCount === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>

          <Button onClick={onCreateEmployee} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      <DataCleanupDialog
        isOpen={isCleanupDialogOpen}
        onClose={() => setIsCleanupDialogOpen(false)}
        onCleanupComplete={handleCleanupComplete}
      />
    </>
  );
};
