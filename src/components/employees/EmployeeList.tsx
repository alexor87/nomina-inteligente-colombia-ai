import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import { useEmployeeList } from '@/hooks/useEmployeeList';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { ImportEmployeesDrawer } from './ImportEmployeesDrawer';
import { EmployeeExcelExportService } from '@/services/EmployeeExcelExportService';
import { useToast } from '@/hooks/use-toast';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useNavigate } from 'react-router-dom';
import { EmployeeListHeader } from './EmployeeListHeader';
import { EmployeeSearchBar } from './EmployeeSearchBar';
import { EmployeeFiltersCollapsible } from './EmployeeFiltersCollapsible';
import { EmployeeBulkActions } from './EmployeeBulkActions';
import { EmployeeTableReadOnly } from './EmployeeTableReadOnly';
import { EmployeeEmptyState } from './EmployeeEmptyState';
import { SupportModeAlert } from './SupportModeAlert';
import { EmployeeCRUDService } from '@/services/EmployeeCRUDService';

export const EmployeeList = () => {
  const navigate = useNavigate();
  const {
    employees,
    allEmployees,
    filters,
    selectedEmployees,
    isLoading,
    pagination,
    updateFilters,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    totalEmployees,
    filteredCount,
    refreshEmployees,
    getComplianceIndicators,
    clearSelection
  } = useEmployeeList();

  const { changeEmployeeStatus, deleteEmployee } = useEmployeeCRUD();
  const { toast } = useToast();

  const [showFilters, setShowFilters] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Verificar si estamos en modo soporte
  const urlParams = new URLSearchParams(window.location.search);
  const supportCompanyId = urlParams.get('support_company');
  const isSupportMode = !!supportCompanyId;

  // Calcular filtros activos
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== '' && value !== undefined && value !== filters.searchTerm
  ).length;

  const handleCreateEmployee = () => {
    navigate('/app/employees/create');
  };

  const handleEditEmployee = (employee: any) => {
    navigate(`/app/employees/${employee.id}/edit`);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      // Check if employee has associated payrolls
      const hasPayrolls = await EmployeeCRUDService.checkEmployeeHasPayrolls(employeeId);
      
      if (hasPayrolls) {
        toast({
          title: "No se puede eliminar el empleado",
          description: "El empleado tiene nóminas asociadas. Primero debe eliminar o transferir las nóminas.",
          variant: "destructive"
        });
        return;
      }

      // Confirm deletion
      if (window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
        const result = await deleteEmployee(employeeId);
        if (result.success) {
          refreshEmployees();
        }
      }
    } catch (error) {
      console.error('Error checking employee payrolls:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar si el empleado tiene nóminas asociadas.",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (employeeId: string, newStatus: string) => {
    const result = await changeEmployeeStatus(employeeId, newStatus);
    if (result.success) {
      refreshEmployees();
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedEmployees.length === 0) return;
    
    setIsBulkUpdating(true);
    
    try {
      // Update each selected employee's status
      const updatePromises = selectedEmployees.map(employeeId => 
        changeEmployeeStatus(employeeId, newStatus)
      );
      
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(result => result.success).length;
      const failureCount = results.length - successCount;
      
      if (successCount > 0) {
        toast({
          title: "Estados actualizados",
          description: `Se actualizaron ${successCount} empleado${successCount !== 1 ? 's' : ''} a ${newStatus}${failureCount > 0 ? `. ${failureCount} falló${failureCount !== 1 ? 'n' : ''}` : ''}.`,
        });
        
        // Refresh the employee list and clear selection
        refreshEmployees();
        clearSelection();
      } else {
        toast({
          title: "Error en actualización masiva",
          description: "No se pudo actualizar el estado de ningún empleado.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in bulk status update:', error);
      toast({
        title: "Error en actualización masiva",
        description: "Ocurrió un error al actualizar los estados.",
        variant: "destructive"
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);
      
      toast({
        title: "Preparando archivo...",
        description: EmployeeExcelExportService.getExportSummary(totalEmployees, filteredCount),
      });

      const result = await EmployeeExcelExportService.exportToExcel(allEmployees, 'empleados');
      
      toast({
        title: "Archivo exportado exitosamente",
        description: `Se exportaron ${result.recordCount} empleados a ${result.fileName}`,
      });
    } catch (error) {
      console.error('Error exporting employees:', error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo Excel. Por favor intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const goBackToSupport = () => {
    window.location.href = '/support-backoffice';
  };

  const currentPageEmployeeIds = employees.map(emp => emp.id);
  const allCurrentPageSelected = currentPageEmployeeIds.every(id => selectedEmployees.includes(id));

  const hasFilters = filters.searchTerm || filters.estado || filters.tipoContrato;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Alerta de modo soporte */}
        {isSupportMode && (
          <SupportModeAlert onGoBackToSupport={goBackToSupport} />
        )}

        {/* Header */}
        <EmployeeListHeader
          filteredCount={filteredCount}
          totalEmployees={totalEmployees}
          searchTerm={filters.searchTerm}
          isSupportMode={isSupportMode}
          showFilters={showFilters}
          isExporting={isExporting}
          employeeCount={employees.length}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onOpenImport={() => setIsImportDrawerOpen(true)}
          onExportToExcel={handleExportToExcel}
          onCreateEmployee={handleCreateEmployee}
          onRefreshData={refreshEmployees}
        />

        {/* Barra de búsqueda con botón de filtros */}
        <EmployeeSearchBar
          searchTerm={filters.searchTerm}
          onSearchChange={(value) => updateFilters({ searchTerm: value })}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Panel de filtros colapsible */}
        {showFilters && (
          <EmployeeFiltersCollapsible
            filters={filters}
            onUpdateFilters={updateFilters}
            onClearFilters={clearFilters}
            totalCount={totalEmployees}
            filteredCount={filteredCount}
          />
        )}

        {/* Acciones en lote */}
        <EmployeeBulkActions
          selectedCount={selectedEmployees.length}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          isUpdating={isBulkUpdating}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Listado de Empleados</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {employees.length > 0 ? (
              <>
                <EmployeeTableReadOnly
                  employees={employees}
                  selectedEmployees={selectedEmployees}
                  allCurrentPageSelected={allCurrentPageSelected}
                  onToggleEmployeeSelection={toggleEmployeeSelection}
                  onToggleAllEmployees={toggleAllEmployees}
                  onEditEmployee={handleEditEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onStatusChange={handleStatusChange}
                  getComplianceIndicators={getComplianceIndicators}
                />
                
                <PaginationControls 
                  pagination={pagination} 
                  itemName="empleados"
                />
              </>
            ) : (
              <EmployeeEmptyState
                hasFilters={!!hasFilters}
                onCreateEmployee={handleCreateEmployee}
              />
            )}
          </CardContent>
        </Card>

        <ImportEmployeesDrawer
          isOpen={isImportDrawerOpen}
          onClose={() => setIsImportDrawerOpen(false)}
          onImportComplete={() => {
            refreshEmployees();
            setIsImportDrawerOpen(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
};
