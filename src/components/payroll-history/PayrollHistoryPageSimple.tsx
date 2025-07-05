
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayrollHistorySimple } from '@/hooks/usePayrollHistorySimple';
import { usePayrollHistoryPagination } from '@/hooks/usePayrollHistoryPagination';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryActions } from './PayrollHistoryActions';
import { PayrollHistoryPagination } from './PayrollHistoryPagination';
import { PayrollHistoryEmptyState } from './PayrollHistoryEmptyState';
import { PayrollHistoryExportService } from '@/services/PayrollHistoryExportService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, History, BarChart3, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ PÁGINA SIMPLE DE HISTORIAL - FASE 3 COMPLETADA
 * Incluye paginación, exportación, navegación y manejo de estados
 */
export const PayrollHistoryPageSimple = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    periods,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refetch,
    totalPeriods,
    filteredCount,
    closedPeriods,
    draftPeriods
  } = usePayrollHistorySimple();

  // Paginación
  const {
    currentPage,
    totalPages,
    paginatedItems,
    totalItems,
    itemsPerPage,
    goToPage,
    resetPage
  } = usePayrollHistoryPagination({ 
    items: periods, 
    itemsPerPage: 10 
  });

  // Reset página cuando cambien los filtros
  React.useEffect(() => {
    resetPage();
  }, [filters, resetPage]);

  const handlePeriodClick = (period: any) => {
    console.log('Navegando a detalles del período:', period.id);
    navigate(`/app/payroll-history/${period.id}`);
  };

  const handleViewDetails = (period: any) => {
    navigate(`/app/payroll-history/${period.id}`);
  };

  const handleEditPeriod = (period: any) => {
    if (period.status === 'cerrado') {
      toast({
        title: "Período cerrado",
        description: "No se puede editar un período cerrado. Debe reabrirlo primero.",
        variant: "destructive"
      });
      return;
    }
    navigate(`/app/period-edit/${period.id}`);
  };

  const handleExport = async () => {
    try {
      toast({
        title: "Exportando datos",
        description: "Preparando archivo de exportación..."
      });

      await PayrollHistoryExportService.exportToCSV(periods, 
        `historial-nomina-${new Date().toISOString().split('T')[0]}`
      );
      
      toast({
        title: "Exportación exitosa",
        description: "El archivo se ha descargado correctamente."
      });
    } catch (error) {
      console.error('Error exportando:', error);
      toast({
        title: "Error en exportación",
        description: "No se pudo exportar el archivo.",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Datos actualizados",
        description: "El historial se ha actualizado correctamente."
      });
    } catch (error) {
      toast({
        title: "Error actualizando",
        description: "No se pudieron actualizar los datos.",
        variant: "destructive"
      });
    }
  };

  const handleCreatePeriod = () => {
    navigate('/app/payroll');
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error cargando el historial de nómina: {error instanceof Error ? error.message : 'Error desconocido'}
        </AlertDescription>
      </Alert>
    );
  }

  // Calcular métricas de resumen
  const totalGrossPay = periods.reduce((sum, p) => sum + p.totalGrossPay, 0);
  const totalNetPay = periods.reduce((sum, p) => sum + p.totalNetPay, 0);
  const totalEmployees = periods.reduce((sum, p) => sum + p.employeesCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Historial de Nómina</h1>
        </div>
        <PayrollHistoryActions 
          onRefresh={handleRefresh}
          onExport={handleExport}
          canCreatePeriod={true}
        />
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {filteredCount} de {totalPeriods} períodos
      </div>

      {/* Métricas de resumen */}
      {totalPeriods > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Total Períodos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900">{totalPeriods}</div>
              <p className="text-xs text-gray-500">
                {closedPeriods} cerrados • {draftPeriods} borradores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Devengado
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalGrossPay)}
              </div>
              <p className="text-xs text-gray-500">En períodos filtrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Neto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalNetPay)}
              </div>
              <p className="text-xs text-gray-500">Pagado a empleados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <History className="h-4 w-4" />
                Empleados Total
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900">{totalEmployees}</div>
              <p className="text-xs text-gray-500">En todos los períodos</p>
            </CardContent>
          </Card>
        </div>
      )}

      <PayrollHistoryFilters
        filters={filters}
        onFiltersChange={updateFilters}
      />

      {periods.length === 0 ? (
        <PayrollHistoryEmptyState 
          hasFilters={!!(filters.status || filters.periodType || filters.employeeSearch || filters.dateRange.from || filters.dateRange.to)}
          onClearFilters={clearFilters}
        />
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <PayrollHistoryTable 
            periods={paginatedItems}
            onPeriodClick={handlePeriodClick}
            onViewDetails={handleViewDetails}
            onEditPeriod={handleEditPeriod}
            canUserEditPeriods={true}
          />
          
          <PayrollHistoryPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  );
};
