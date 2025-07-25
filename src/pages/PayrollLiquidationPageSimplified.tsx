
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Users, Settings, RotateCcw } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { SimplePeriodSelector } from '@/components/payroll/SimplePeriodSelector';
import { AutoSaveIndicator } from '@/components/payroll/AutoSaveIndicator';
import { usePayrollLiquidationSimplified } from '@/hooks/usePayrollLiquidationSimplified';
import { useSimplePeriodSelection } from '@/hooks/useSimplePeriodSelection';
import { EmployeeAddModal } from '@/components/payroll/modals/EmployeeAddModal';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { PayrollCleanupService } from '@/services/PayrollCleanupService';
import { PeriodCleanupDialog } from '@/components/payroll/PeriodCleanupDialog';
import { SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { PayrollProgressIndicator } from '@/components/payroll/liquidation/PayrollProgressIndicator';
import { ReliquidationDialog } from '@/components/payroll/liquidation/ReliquidationDialog';
import { PayrollValidationService } from '@/services/PayrollValidationService';
import { PayrollWorldClassControlPanel } from '@/components/payroll/liquidation/PayrollWorldClassControlPanel';
import { PayrollRecoveryPanel } from '@/components/payroll/recovery/PayrollRecoveryPanel';

const PayrollLiquidationPageSimplified = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showReliquidationDialog, setShowReliquidationDialog] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [periodSelected, setPeriodSelected] = useState(false);
  const [periodAlreadyLiquidated, setPeriodAlreadyLiquidated] = useState(false);
  const [validationSummary, setValidationSummary] = useState<any>(null);
  
  const { companyId } = useCurrentCompany();
  
  // ✅ USAR HOOK SIMPLIFICADO
  const {
    employees,
    isLoading,
    isLiquidating,
    currentPeriodId,
    currentPeriod,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    updateEmployeeCalculationsInDB,
    isAutoSaving,
    lastAutoSaveTime,
    isRemovingEmployee,
    canProceedWithLiquidation,
    isLoadingEmployees,
    validatePeriod,
    showProgress,
    liquidationStep,
    liquidationProgress,
    processedEmployees,
    liquidationErrors,
    // World-class features
    useAtomicLiquidation,
    setUseAtomicLiquidation,
    useExhaustiveValidation,
    setUseExhaustiveValidation,
    exhaustiveValidationResults,
    isValidating,
    performExhaustiveValidation,
    autoRepairValidationIssues
  } = usePayrollLiquidationSimplified(companyId || '');

  const {
    selectedPeriod,
    handlePeriodSelect,
    resetSelection,
    markCurrentPeriodAsLiquidated
  } = useSimplePeriodSelection(companyId || '');

  // Limpiar períodos abandonados al montar
  useEffect(() => {
    PayrollCleanupService.cleanupAbandonedPeriods();
  }, []);

  // ✅ MÉTODO SIMPLIFICADO: Solo cargar empleados
  const handlePeriodSelection = async (period: SelectablePeriod) => {
    console.log('🎯 Período seleccionado:', period.label);
    handlePeriodSelect(period);
    setPeriodSelected(true);
    
    // Cargar empleados con el método simplificado
    await loadEmployees(period.startDate, period.endDate);
  };

  const handleLiquidate = async () => {
    if (!selectedPeriod || employees.length === 0 || !currentPeriodId || !companyId) return;
    
    try {
      // Validar período antes de liquidar
      const validation = await PayrollValidationService.validatePreLiquidation(
        currentPeriodId,
        companyId
      );
      
      // Verificar si el período ya está liquidado
      const isAlreadyLiquidated = validation.issues.some(
        issue => issue.type === 'period_already_liquidated'
      );
      
      if (isAlreadyLiquidated) {
        setValidationSummary(validation.summary);
        setShowReliquidationDialog(true);
        setPeriodAlreadyLiquidated(true);
        return;
      }
      
      // Si no está liquidado, proceder normalmente
      await liquidatePayroll(selectedPeriod.startDate, selectedPeriod.endDate);
      await markCurrentPeriodAsLiquidated();
    } catch (error) {
      console.error('Error en handleLiquidate:', error);
    }
  };

  const handleReliquidate = async () => {
    if (!selectedPeriod || !currentPeriodId) return;
    
    try {
      setShowReliquidationDialog(false);
      await liquidatePayroll(selectedPeriod.startDate, selectedPeriod.endDate, true);
      await markCurrentPeriodAsLiquidated();
      setPeriodAlreadyLiquidated(false);
    } catch (error) {
      console.error('Error en re-liquidación:', error);
    }
  };

  const handleViewResults = () => {
    setShowReliquidationDialog(false);
    // TODO: Implementar navegación a vista de resultados
    console.log('Ver resultados de liquidación...');
  };

  const handleAddEmployees = async (employeeIds: string[]) => {
    try {
      await addEmployees(employeeIds);
      setShowAddEmployeeModal(false);
    } catch (error) {
      console.error('Error adding employees:', error);
    }
  };

  const handleReset = () => {
    resetSelection();
    setPeriodSelected(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Liquidación de Nómina</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {employees.length > 0 && (
            <AutoSaveIndicator 
              isSaving={isAutoSaving}
              lastSaveTime={lastAutoSaveTime}
            />
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCleanupDialog(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Limpiar Períodos
          </Button>
        </div>
      </div>

      {/* World-Class Control Panel */}
      {periodSelected && selectedPeriod && (
        <PayrollWorldClassControlPanel
          useAtomicLiquidation={useAtomicLiquidation}
          setUseAtomicLiquidation={setUseAtomicLiquidation}
          useExhaustiveValidation={useExhaustiveValidation}
          setUseExhaustiveValidation={setUseExhaustiveValidation}
          exhaustiveValidationResults={exhaustiveValidationResults}
          isValidating={isValidating}
          onPerformExhaustiveValidation={async () => { await performExhaustiveValidation(); }}
          onAutoRepairIssues={async () => { await autoRepairValidationIssues(); }}
          onStartLiquidation={handleLiquidate}
          canProceedWithLiquidation={canProceedWithLiquidation}
          showProgress={showProgress}
          liquidationProgress={liquidationProgress}
          liquidationStep={liquidationStep}
        />
      )}

      {/* Recovery Panel */}
      {showRecoveryPanel && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-orange-800">Diagnóstico y Reparación del Sistema</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecoveryPanel(false)}
                className="text-orange-600"
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PayrollRecoveryPanel onClose={() => setShowRecoveryPanel(false)} />
          </CardContent>
        </Card>
      )}

      {/* ✅ INFORMACIÓN ARQUITECTÓNICA */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-800">Sistema de Liquidación de Clase Mundial</h3>
                <p className="text-blue-700 text-sm">
                  Liquidación atómica con validaciones exhaustivas, detección automática de problemas y recuperación inteligente.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecoveryPanel(true)}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Diagnóstico y Reparación
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selector de Período */}
      {companyId && !periodSelected && (
        <SimplePeriodSelector
          companyId={companyId}
          onPeriodSelected={handlePeriodSelection}
          disabled={isLoadingEmployees}
        />
      )}

      {/* Información del Período Seleccionado */}
      {selectedPeriod && periodSelected && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-800">Período Activo</h3>
                <p className="text-green-700">{selectedPeriod.label}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-green-700 border-green-200 hover:bg-green-100"
              >
                Cambiar Período
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Empleados */}
      {employees.length > 0 && selectedPeriod && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <CardTitle>Empleados a Liquidar ({employees.length})</CardTitle>
                <AutoSaveIndicator 
                  isSaving={isAutoSaving}
                  lastSaveTime={lastAutoSaveTime}
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowAddEmployeeModal(true)}
                  variant="outline"
                  disabled={isLoading || !currentPeriodId || isRemovingEmployee}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Agregar Empleado
                </Button>
                <Button 
                  onClick={handleLiquidate}
                  disabled={isLiquidating || !canProceedWithLiquidation || isRemovingEmployee}
                  className={periodAlreadyLiquidated ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"}
                >
                  {isLiquidating ? 'Liquidando...' : periodAlreadyLiquidated ? 'Re-liquidar' : 'Liquidar Nómina'}
                  {periodAlreadyLiquidated && <RotateCcw className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <PayrollLiquidationTable
              employees={employees}
              startDate={selectedPeriod.startDate}
              endDate={selectedPeriod.endDate}
              currentPeriodId={currentPeriodId}
              currentPeriod={currentPeriod}
              onRemoveEmployee={removeEmployee}
              onEmployeeNovedadesChange={refreshEmployeeNovedades}
              updateEmployeeCalculationsInDB={updateEmployeeCalculationsInDB}
            />
          </CardContent>
        </Card>
      )}

      {/* Indicador de Progreso */}
      <PayrollProgressIndicator
        currentStep={liquidationStep}
        progress={liquidationProgress}
        totalEmployees={employees.length}
        processedEmployees={processedEmployees}
        errors={liquidationErrors}
        isVisible={showProgress}
      />

      {/* Modales */}
      <PeriodCleanupDialog
        isOpen={showCleanupDialog}
        onClose={() => setShowCleanupDialog(false)}
        onCleanupComplete={() => {
          // Opcional: recargar períodos si es necesario
        }}
      />

      <EmployeeAddModal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        onAddEmployees={handleAddEmployees}
        currentEmployeeIds={employees.map(emp => emp.id)}
        companyId={companyId || ''}
      />

      <ReliquidationDialog
        isOpen={showReliquidationDialog}
        onClose={() => setShowReliquidationDialog(false)}
        onViewResults={handleViewResults}
        onReliquidate={handleReliquidate}
        periodName={selectedPeriod?.label || ''}
        summary={validationSummary}
        isReliquidating={isLiquidating}
      />
    </div>
  );
};

export default PayrollLiquidationPageSimplified;
