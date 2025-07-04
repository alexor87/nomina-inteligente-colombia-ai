
import React from 'react';
import { usePayrollHistorySimple } from '@/hooks/usePayrollHistorySimple';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, History, BarChart3, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

/**
 * ✅ PÁGINA SIMPLE DE HISTORIAL - FASE 2 REPARACIÓN CRÍTICA
 * Muestra datos reales sincronizados con métricas útiles
 */
export const PayrollHistoryPageSimple = () => {
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

  const handlePeriodClick = (period: any) => {
    console.log('Período seleccionado:', period);
    // TODO: Implementar navegación a detalles del período
  };

  const handleViewDetails = (period: any) => {
    console.log('Ver detalles:', period);
    // TODO: Implementar vista de detalles
  };

  const handleEditPeriod = (period: any) => {
    console.log('Editar período:', period);
    // TODO: Implementar edición de período
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

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

  // ✅ MÉTRICAS DE RESUMEN
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
        <div className="text-sm text-gray-500">
          {filteredCount} de {totalPeriods} períodos
        </div>
      </div>

      {/* ✅ MÉTRICAS DE RESUMEN */}
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
        <div className="text-center py-12">
          <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay períodos de nómina
          </h3>
          <p className="text-gray-500">
            Los períodos de nómina aparecerán aquí una vez que sean creados y procesados.
          </p>
        </div>
      ) : (
        <PayrollHistoryTable 
          periods={periods}
          onPeriodClick={handlePeriodClick}
          onViewDetails={handleViewDetails}
          onEditPeriod={handleEditPeriod}
          canUserEditPeriods={true}
        />
      )}
    </div>
  );
};
