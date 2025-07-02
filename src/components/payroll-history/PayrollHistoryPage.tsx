import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PayrollHistoryPeriod, PayrollHistoryFilters as FiltersType } from '@/types/payroll-history';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { toast } from '@/hooks/use-toast';

export const PayrollHistoryPage = () => {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [filteredPeriods, setFilteredPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {},
    status: '',
    costCenter: '',
    periodType: undefined,
    employeeSearch: ''
  });

  const {
    isLoading,
    isExporting,
    canUserReopenPeriods: canUserEditPeriods,
    checkUserPermissions,
    exportToExcel
  } = usePayrollHistory();

  useEffect(() => {
    loadPayrollHistory();
    checkUserPermissions();
  }, [checkUserPermissions]);

  useEffect(() => {
    applyFilters();
  }, [periods, filters]);

  const loadPayrollHistory = async () => {
    try {
      const data = await PayrollHistoryService.getPayrollPeriods();
      
      // Convert PayrollHistoryRecord[] to PayrollHistoryPeriod[]
      const convertedPeriods: PayrollHistoryPeriod[] = data.map(record => {
        // Fix the status mapping logic to handle all possible estados
        let mappedStatus: 'cerrado' | 'con_errores' | 'revision' | 'editado' | 'reabierto' = 'revision';
        
        switch (record.estado) {
          case 'cerrada':
          case 'procesada':
          case 'pagada':
            mappedStatus = 'cerrado';
            break;
          case 'borrador':
            mappedStatus = 'revision';
            break;
          default:
            mappedStatus = 'con_errores';
            break;
        }

        return {
          id: record.id,
          period: record.periodo || 'Sin período',
          startDate: record.fecha_inicio || record.fechaCreacion,
          endDate: record.fecha_fin || record.fechaCreacion,
          type: 'mensual' as const,
          employeesCount: record.empleados || 0,
          status: mappedStatus,
          totalGrossPay: Number(record.totalNomina || 0),
          totalNetPay: Number(record.totalNomina || 0),
          totalDeductions: 0,
          totalCost: Number(record.totalNomina || 0),
          employerContributions: 0,
          paymentStatus: record.estado === 'pagada' ? 'pagado' as const : 'pendiente' as const,
          version: 1,
          createdAt: record.fechaCreacion || new Date().toISOString(),
          updatedAt: record.fechaCreacion || new Date().toISOString(),
          editable: record.editable !== false,
          reportedToDian: record.reportado_dian || false
        };
      });
      setPeriods(convertedPeriods);
    } catch (error) {
      console.error('Error loading payroll history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de nómina",
        variant: "destructive"
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...periods];

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.periodType) {
      filtered = filtered.filter(p => p.type === filters.periodType);
    }

    if (filters.dateRange.from) {
      filtered = filtered.filter(p => new Date(p.startDate) >= new Date(filters.dateRange.from!));
    }

    if (filters.dateRange.to) {
      filtered = filtered.filter(p => new Date(p.endDate) <= new Date(filters.dateRange.to!));
    }

    if (filters.employeeSearch) {
      filtered = filtered.filter(p => 
        p.period.toLowerCase().includes(filters.employeeSearch!.toLowerCase())
      );
    }

    setFilteredPeriods(filtered);
  };

  const handleViewDetails = (period: PayrollHistoryPeriod) => {
    navigate(`/app/payroll-history/${period.id}`);
  };

  const handleEditPeriod = (period: PayrollHistoryPeriod) => {
    navigate(`/app/payroll-history/${period.id}/edit`);
  };

  const handleExportToExcel = async () => {
    await exportToExcel(filteredPeriods);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Historial de Nómina</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona y consulta el historial de períodos de nómina procesados
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleExportToExcel}
                disabled={isExporting}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Excel'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <PayrollHistoryFilters
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <PayrollHistoryTable
            periods={filteredPeriods}
            onViewDetails={handleViewDetails}
            onEditPeriod={handleEditPeriod}
            canUserEditPeriods={canUserEditPeriods}
          />
        </div>
      </div>
    </div>
  );
};