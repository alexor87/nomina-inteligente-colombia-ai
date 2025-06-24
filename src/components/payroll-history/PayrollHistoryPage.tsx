
import { useState, useEffect } from 'react';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryDetails } from './PayrollHistoryDetails';
import { ReopenDialog } from './ReopenDialog';
import { EditWizard } from './EditWizard';
import { Button } from '@/components/ui/button';
import { Download, History, FileText } from 'lucide-react';
import { PayrollHistoryPeriod, PayrollHistoryFilters as Filters, EditWizardSteps } from '@/types/payroll-history';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { useToast } from '@/hooks/use-toast';

export const PayrollHistoryPage = () => {
  const [filters, setFilters] = useState<Filters>({
    dateRange: {}
  });
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [periods, setPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [periodToReopen, setPeriodToReopen] = useState<PayrollHistoryPeriod | null>(null);
  const { toast } = useToast();

  const {
    isLoading,
    isReopening,
    isExporting,
    reopenPeriod,
    closePeriodWithWizard,
    exportToExcel,
    downloadFile
  } = usePayrollHistory();

  // Cargar períodos reales desde la base de datos
  useEffect(() => {
    loadPayrollPeriods();
  }, []);

  const loadPayrollPeriods = async () => {
    try {
      setIsLoadingPeriods(true);
      const realPeriods = await PayrollHistoryService.getPayrollPeriods();
      
      // Convertir los datos del servicio al formato esperado por el componente
      const convertedPeriods: PayrollHistoryPeriod[] = realPeriods.map(record => ({
        id: record.id,
        period: record.periodo,
        startDate: record.fechaCreacion.split('T')[0],
        endDate: record.fechaCreacion.split('T')[0],
        type: 'mensual' as const,
        employeesCount: record.empleados,
        status: record.estado === 'cerrada' ? 'cerrado' : 
                record.estado === 'pagada' ? 'cerrado' : 
                record.estado === 'procesada' ? 'revision' : 'con_errores',
        totalGrossPay: record.totalNomina * 1.3, // Estimado incluyendo prestaciones
        totalNetPay: record.totalNomina,
        totalDeductions: record.totalNomina * 0.23, // Estimado de deducciones
        totalCost: record.totalNomina * 1.15, // Costo total estimado
        employerContributions: record.totalNomina * 0.15, // Aportes empleador
        pilaFileUrl: undefined,
        paymentStatus: record.estado === 'pagada' ? 'pagado' : 
                      record.estado === 'procesada' ? 'parcial' : 'pendiente',
        version: 1,
        createdAt: record.fechaCreacion,
        updatedAt: record.fechaCreacion
      }));

      setPeriods(convertedPeriods);
    } catch (error) {
      console.error('Error loading payroll periods:', error);
      toast({
        title: "Error al cargar períodos",
        description: "No se pudieron cargar los períodos de nómina",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  const handleViewDetails = (period: PayrollHistoryPeriod) => {
    setSelectedPeriod(period);
  };

  const handleReopenPeriod = async (period: PayrollHistoryPeriod) => {
    // Verificar permisos (simulado)
    const userRole = 'Administrador'; // En un caso real, esto vendría del contexto de usuario
    
    if (userRole !== 'Administrador' && userRole !== 'Editor histórico') {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para reabrir períodos",
        variant: "destructive"
      });
      return;
    }

    if (period.paymentStatus === 'pagado' && period.status === 'cerrado') {
      const confirmReopen = confirm(
        'Este período ya fue pagado completamente. ¿Está seguro de que desea reabrirlo? Esto puede requerir una nota de ajuste.'
      );
      if (!confirmReopen) return;
    }

    setPeriodToReopen(period);
    setReopenDialogOpen(true);
  };

  const handleConfirmReopen = async (reason: string) => {
    if (!periodToReopen) return;

    try {
      const newVersion = await reopenPeriod({
        periodId: periodToReopen.id,
        reason,
        userId: 'admin@empresa.com' // En un caso real, esto vendría del contexto
      });

      // Actualizar la lista de períodos
      setPeriods(prev => [newVersion, ...prev]);
      setReopenDialogOpen(false);
      setPeriodToReopen(null);
    } catch (error) {
      console.error('Error reopening period:', error);
    }
  };

  const handleExportToExcel = async () => {
    await exportToExcel(filteredPeriods);
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    await downloadFile(fileUrl, fileName);
  };

  const handleCloseEditWizard = async (wizardSteps: EditWizardSteps) => {
    if (!selectedPeriod) return;
    
    try {
      await closePeriodWithWizard(selectedPeriod.id, wizardSteps);
      setEditWizardOpen(false);
      
      // Actualizar el estado del período
      setPeriods(prev => prev.map(p => 
        p.id === selectedPeriod.id 
          ? { ...p, status: 'cerrado', updatedAt: new Date().toISOString() }
          : p
      ));
    } catch (error) {
      console.error('Error processing period:', error);
    }
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
      <>
        <PayrollHistoryDetails 
          period={selectedPeriod} 
          onBack={() => setSelectedPeriod(null)}
        />
        
        <EditWizard
          isOpen={editWizardOpen}
          onClose={() => setEditWizardOpen(false)}
          onConfirm={handleCloseEditWizard}
          isProcessing={isLoading}
        />
      </>
    );
  }

  if (isLoadingPeriods) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando períodos de nómina...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <History className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Historial de Nómina</h1>
                  <p className="text-gray-600">Consulta, audita y edita períodos de nómina cerrados</p>
                </div>
              </div>
              <Button 
                onClick={handleExportToExcel} 
                disabled={isExporting || filteredPeriods.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Excel'}
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
          {periods.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay períodos de nómina</h3>
                <p className="text-gray-600">
                  Los períodos aparecerán aquí una vez que se cierren en el módulo de liquidación.
                </p>
              </div>
            </div>
          ) : (
            <PayrollHistoryTable 
              periods={filteredPeriods}
              onViewDetails={handleViewDetails}
              onReopenPeriod={handleReopenPeriod}
              onDownloadFile={handleDownloadFile}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ReopenDialog
        isOpen={reopenDialogOpen}
        onClose={() => {
          setReopenDialogOpen(false);
          setPeriodToReopen(null);
        }}
        onConfirm={handleConfirmReopen}
        period={periodToReopen}
        isProcessing={isReopening}
      />
    </>
  );
};
