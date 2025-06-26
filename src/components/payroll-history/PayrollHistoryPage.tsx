
import { useState } from 'react';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { PayrollHistoryDetails } from './PayrollHistoryDetails';
import { ReopenDialog } from './ReopenDialog';
import { EditWizard } from './EditWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Clock, AlertCircle } from 'lucide-react';
import { PayrollHistoryPeriod, PayrollHistoryFilters as FiltersType } from '@/types/payroll-history';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useEffect } from 'react';

export const PayrollHistoryPage = () => {
  const [periods, setPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [filteredPeriods, setFilteredPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {},
    status: '',
    costCenter: '',
    periodType: undefined,
    employeeSearch: ''
  });

  const {
    isLoading: isProcessing,
    isReopening,
    isExporting,
    reopenPeriod,
    closePeriodWithWizard,
    exportToExcel,
    downloadFile
  } = usePayrollHistory();

  // Add pagination for payroll history periods
  const pagination = usePagination(filteredPeriods, {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 75, 100],
    storageKey: 'payroll-history'
  });

  useEffect(() => {
    loadPayrollHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [periods, filters]);

  const loadPayrollHistory = async () => {
    try {
      setIsLoading(true);
      const data = await PayrollHistoryService.getPayrollPeriods();
      // Convert PayrollHistoryRecord[] to PayrollHistoryPeriod[]
      const convertedPeriods: PayrollHistoryPeriod[] = data.map(record => ({
        id: record.id,
        period: record.periodo || 'Sin período',
        startDate: record.fechaCreacion || new Date().toISOString().split('T')[0],
        endDate: record.fechaCreacion || new Date().toISOString().split('T')[0],
        type: 'mensual' as const,
        employeesCount: record.empleados || 0,
        status: (record.estado === 'cerrada' ? 'cerrado' : record.estado === 'borrador' ? 'revision' : 'con_errores') as 'cerrado' | 'con_errores' | 'revision',
        totalGrossPay: Number(record.totalNomina || 0),
        totalNetPay: Number(record.totalNomina || 0),
        totalDeductions: 0,
        totalCost: Number(record.totalNomina || 0),
        employerContributions: 0,
        paymentStatus: 'pendiente' as const,
        version: 1,
        createdAt: record.fechaCreacion || new Date().toISOString(),
        updatedAt: record.fechaCreacion || new Date().toISOString(),
      }));
      setPeriods(convertedPeriods);
    } catch (error) {
      console.error('Error loading payroll history:', error);
    } finally {
      setIsLoading(false);
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
    setSelectedPeriod(period);
    setShowDetails(true);
  };

  const handleReopenPeriod = (period: PayrollHistoryPeriod) => {
    setSelectedPeriod(period);
    setShowReopenDialog(true);
  };

  const handleExportToExcel = async () => {
    await exportToExcel(filteredPeriods);
  };

  const handleReopenConfirm = async (reason: string) => {
    if (!selectedPeriod) return;
    
    try {
      const newPeriod = await reopenPeriod({
        periodId: selectedPeriod.id,
        reason,
        userId: 'admin@empresa.com'
      });
      
      setPeriods(prev => [newPeriod, ...prev]);
      setShowReopenDialog(false);
      setSelectedPeriod(null);
    } catch (error) {
      console.error('Error reopening period:', error);
    }
  };

  const handleEditWizardComplete = async (steps: any) => {
    if (!selectedPeriod) return;
    
    try {
      await closePeriodWithWizard(selectedPeriod.id, steps);
      setShowEditWizard(false);
      setSelectedPeriod(null);
      await loadPayrollHistory();
    } catch (error) {
      console.error('Error processing period:', error);
    }
  };

  const getStatusSummary = () => {
    const summary = {
      total: filteredPeriods.length,
      cerrados: filteredPeriods.filter(p => p.status === 'cerrado').length,
      conErrores: filteredPeriods.filter(p => p.status === 'con_errores').length,
      enRevision: filteredPeriods.filter(p => p.status === 'revision').length
    };
    return summary;
  };

  const statusSummary = getStatusSummary();

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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Períodos</p>
                  <p className="text-2xl font-bold text-gray-900">{statusSummary.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cerrados</p>
                  <p className="text-2xl font-bold text-green-600">{statusSummary.cerrados}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">✓</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Con Errores</p>
                  <p className="text-2xl font-bold text-red-600">{statusSummary.conErrores}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Revisión</p>
                  <p className="text-2xl font-bold text-yellow-600">{statusSummary.enRevision}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <PayrollHistoryFilters
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Table with Pagination */}
        <div className="bg-white rounded-lg shadow">
          <PayrollHistoryTable
            periods={pagination.paginatedItems}
            onViewDetails={handleViewDetails}
            onReopenPeriod={handleReopenPeriod}
            onDownloadFile={downloadFile}
          />
          
          <PaginationControls 
            pagination={pagination} 
            itemName="períodos"
          />
        </div>
      </div>

      {/* Modals */}
      {showDetails && selectedPeriod && (
        <PayrollHistoryDetails
          period={selectedPeriod}
          onBack={() => {
            setShowDetails(false);
            setSelectedPeriod(null);
          }}
        />
      )}

      {showReopenDialog && selectedPeriod && (
        <ReopenDialog
          isOpen={showReopenDialog}
          onClose={() => {
            setShowReopenDialog(false);
            setSelectedPeriod(null);
          }}
          onConfirm={handleReopenConfirm}
          period={selectedPeriod}
          isProcessing={isReopening}
        />
      )}

      {showEditWizard && selectedPeriod && (
        <EditWizard
          isOpen={showEditWizard}
          onClose={() => {
            setShowEditWizard(false);
            setSelectedPeriod(null);
          }}
          onConfirm={handleEditWizardComplete}
          period={selectedPeriod}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};
