
import { useState } from 'react';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryDetails } from './PayrollHistoryDetails';
import { ReopenDialog } from './ReopenDialog';
import { EditWizard } from './EditWizard';
import { Button } from '@/components/ui/button';
import { Download, History } from 'lucide-react';
import { mockPayrollHistoryPeriods } from '@/data/mockPayrollHistory';
import { PayrollHistoryPeriod, PayrollHistoryFilters as Filters, EditWizardSteps } from '@/types/payroll-history';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';

export const PayrollHistoryPage = () => {
  const [filters, setFilters] = useState<Filters>({
    dateRange: {}
  });
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [periods, setPeriods] = useState(mockPayrollHistoryPeriods);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [periodToReopen, setPeriodToReopen] = useState<PayrollHistoryPeriod | null>(null);

  const {
    isLoading,
    isReopening,
    isExporting,
    reopenPeriod,
    closePeriodWithWizard,
    exportToExcel,
    downloadFile
  } = usePayrollHistory();

  const handleViewDetails = (period: PayrollHistoryPeriod) => {
    setSelectedPeriod(period);
  };

  const handleReopenPeriod = (period: PayrollHistoryPeriod) => {
    // Verificar permisos (simulado)
    const userRole = 'Administrador'; // En un caso real, esto vendría del contexto de usuario
    
    if (userRole !== 'Administrador' && userRole !== 'Editor histórico') {
      alert('No tiene permisos para reabrir períodos');
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
          onBack={() => setSelectedP
          onReopenPeriod={() => handleReopenPeriod(selectedPeriod)}
          onDownloadFile={handleDownloadFile}
          onOpenEditWizard={() => setEditWizardOpen(true)}
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
                  <p className="text-gray-600">Consulta y gestiona los períodos de nómina cerrados</p>
                </div>
              </div>
              <Button 
                onClick={handleExportToExcel} 
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar a Excel'}
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
            onDownloadFile={handleDownloadFile}
          />
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
