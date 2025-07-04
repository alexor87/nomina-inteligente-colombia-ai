
import React from 'react';
import { usePayrollHistorySimple } from '@/hooks/usePayrollHistorySimple';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, History } from 'lucide-react';

/**
 * ✅ PÁGINA SIMPLE DE HISTORIAL - CORRECCIÓN FASE 1
 * Muestra datos existentes sin dependencias complejas
 */
export const PayrollHistoryPageSimple = () => {
  const {
    periods,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refetch
  } = usePayrollHistorySimple();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Historial de Nómina</h1>
        </div>
        <div className="text-sm text-gray-500">
          {periods.length} períodos encontrados
        </div>
      </div>

      <PayrollHistoryFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
      />

      {periods.length === 0 ? (
        <div className="text-center py-12">
          <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay períodos de nómina
          </h3>
          <p className="text-gray-500">
            Los períodos de nómina aparecerán aquí una vez que sean creados.
          </p>
        </div>
      ) : (
        <PayrollHistoryTable 
          periods={periods} 
          onRefresh={refetch}
        />
      )}
    </div>
  );
};
