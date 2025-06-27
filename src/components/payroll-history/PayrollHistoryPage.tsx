
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { ReopenPeriodModal } from './ReopenPeriodModal';
import { EditWizard } from './EditWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { PayrollHistoryPeriod, PayrollHistoryFilters as FiltersType } from '@/types/payroll-history';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { toast } from '@/hooks/use-toast';

export const PayrollHistoryPage = () => {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [filteredPeriods, setFilteredPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [hasVouchers, setHasVouchers] = useState(false);
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
    canUserReopenPeriods,
    checkUserPermissions,
    reopenPeriod,
    closePeriodAgain,
    canReopenPeriod,
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
    checkUserPermissions();
  }, [checkUserPermissions]);

  useEffect(() => {
    applyFilters();
  }, [periods, filters]);

  const loadPayrollHistory = async () => {
    try {
      setIsLoading(true);
      const data = await PayrollHistoryService.getPayrollPeriods();
      // Convert PayrollHistoryRecord[] to PayrollHistoryPeriod[]
      const convertedPeriods: PayrollHistoryPeriod[] = data.map(record => {
        // Fix the status mapping logic
        let mappedStatus: 'cerrado' | 'con_errores' | 'revision' | 'reabierto' = 'revision';
        
        switch (record.estado) {
          case 'cerrada':
          case 'procesada':
          case 'pagada':
            mappedStatus = 'cerrado';
            break;
          case 'reabierto':
            mappedStatus = 'reabierto';
            break;
          case 'borrador':
            mappedStatus = 'revision';
            break;
          default:
            // Only mark as 'con_errores' if there's an actual error status
            // or if we detect data inconsistencies
            mappedStatus = 'con_errores';
            break;
        }

        return {
          id: record.id,
          period: record.periodo || 'Sin período',
          startDate: record.fechaCreacion || new Date().toISOString().split('T')[0],
          endDate: record.fechaCreacion || new Date().toISOString().split('T')[0],
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
          editable: true, // Default to true, will be updated from DB
          reportedToDian: false // Default to false
        };
      });
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
    navigate(`/app/payroll-history/${period.id}`);
  };

  const handleReopenPeriod = async (period: PayrollHistoryPeriod) => {
    try {
      // Verificar si se puede reabrir y si tiene comprobantes
      const { canReopen, reason, hasVouchers: periodHasVouchers } = await canReopenPeriod(period.period);
      
      if (!canReopen) {
        toast({
          title: "No se puede reabrir",
          description: reason || "Este período no puede ser reabierto",
          variant: "destructive"
        });
        return;
      }

      setSelectedPeriod(period);
      setHasVouchers(periodHasVouchers);
      setShowReopenModal(true);
    } catch (error) {
      console.error('Error checking reopen status:', error);
      toast({
        title: "Error",
        description: "Error verificando el estado del período",
        variant: "destructive"
      });
    }
  };

  const handleClosePeriod = async (period: PayrollHistoryPeriod) => {
    try {
      await closePeriodAgain(period.period);
      await loadPayrollHistory(); // Reload to show updated status
    } catch (error) {
      console.error('Error closing period:', error);
    }
  };

  const handleReopenConfirm = async () => {
    if (!selectedPeriod) return;
    
    try {
      await reopenPeriod(selectedPeriod.period);
      await loadPayrollHistory(); // Reload to show updated status
      setShowReopenModal(false);
      setSelectedPeriod(null);
      
      // Mostrar botón para ir a liquidar
      toast({
        title: "¿Quieres ir a liquidar?",
        description: (
          <div className="flex items-center gap-2 mt-2">
            <span>El período fue reabierto correctamente.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/app/payroll')}
              className="ml-2"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              Ir a liquidar
            </Button>
          </div>
        ),
      });
      
    } catch (error) {
      console.error('Error reopening period:', error);
    }
  };

  const handleExportToExcel = async () => {
    await exportToExcel(filteredPeriods);
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
      enRevision: filteredPeriods.filter(p => p.status === 'revision').length,
      reabiertos: filteredPeriods.filter(p => p.status === 'reabierto').length
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  <p className="text-sm font-medium text-gray-600">Reabiertos</p>
                  <p className="text-2xl font-bold text-amber-600">{statusSummary.reabiertos}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800">🟡</Badge>
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
            onClosePeriod={handleClosePeriod}
            onDownloadFile={downloadFile}
            canUserReopenPeriods={canUserReopenPeriods}
          />
          
          <PaginationControls 
            pagination={pagination} 
            itemName="períodos"
          />
        </div>
      </div>

      {/* Reopen Period Modal */}
      {showReopenModal && selectedPeriod && (
        <ReopenPeriodModal
          isOpen={showReopenModal}
          onClose={() => {
            setShowReopenModal(false);
            setSelectedPeriod(null);
            setHasVouchers(false);
          }}
          onConfirm={handleReopenConfirm}
          period={selectedPeriod}
          isProcessing={isReopening}
          hasVouchers={hasVouchers}
        />
      )}

      {/* Edit Wizard Modal */}
      {showEditWizard && (
        <EditWizard
          isOpen={showEditWizard}
          onClose={() => {
            setShowEditWizard(false);
            setSelectedPeriod(null);
          }}
          onConfirm={handleEditWizardComplete}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};
