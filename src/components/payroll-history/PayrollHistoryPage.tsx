
import { useState } from 'react';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryDetails } from './PayrollHistoryDetails';
import { Button } from '@/components/ui/button';
import { Download, History } from 'lucide-react';
import { mockPayrollHistoryPeriods } from '@/data/mockPayrollHistory';
import { PayrollHistoryPeriod, PayrollHistoryFilters as Filters } from '@/types/payroll-history';

export const PayrollHistoryPage = () => {
  const [filters, setFilters] = useState<Filters>({
    dateRange: {}
  });
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [periods] = useState(mockPayrollHistoryPeriods);

  const handleViewDetails = (period: PayrollHistoryPeriod) => {
    setSelectedPeriod(period);
  };

  const handleReopenPeriod = (period: PayrollHistoryPeriod) => {
    console.log('Reabrir período:', period);
    // TODO: Implementar lógica de reapertura
  };

  const handleExportToExcel = () => {
    console.log('Exportar a Excel');
    // TODO: Implementar exportación
  };

  // Filtrar períodos basado en los filtros aplicados
  const filteredPeriods = periods.filter(period => {
    if (filters.status && period.status !== filters.status) return false;
    if (filters.periodType && period.type !== filters.periodType) return false;
    if (filters.employeeSearch) {
      // TODO: Implementar búsqueda por empleado cuando tengamos los datos
      return true;
    }
    if (filters.dateRange.from || filters.dateRange.to) {
      const periodDate = new Date(period.startDate);
      if (filters.dateRange.from && periodDate < new Date(filters.dateRange.from)) return false;
      if (filters.dateRange.to && periodDate > new Date(filters.dateRange.to)) return false;
    }
    return true;
  });

  if (selectedPeriod) {
    return (
      <PayrollHistoryDetails 
        period={selectedPeriod} 
        onBack={() => setSelectedPeriod(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <History className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Historial de Nómina</h1>
                <p className="text-gray-600">Consulta y gestiona los períodos de nómina cerrados</p>
              </div>
            </div>
            <Button onClick={handleExportToExcel} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <PayrollHistoryFilters 
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{filteredPeriods.length}</div>
            <div className="text-sm text-gray-600">Períodos encontrados</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {filteredPeriods.filter(p => p.status === 'cerrado').length}
            </div>
            <div className="text-sm text-gray-600">Períodos cerrados</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-red-600">
              {filteredPeriods.filter(p => p.status === 'con_errores').length}
            </div>
            <div className="text-sm text-gray-600">Con errores</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {filteredPeriods.filter(p => p.version > 1).length}
            </div>
            <div className="text-sm text-gray-600">Períodos editados</div>
          </div>
        </div>

        {/* Tabla */}
        <PayrollHistoryTable 
          periods={filteredPeriods}
          onViewDetails={handleViewDetails}
          onReopenPeriod={handleReopenPeriod}
        />
      </div>
    </div>
  );
};
