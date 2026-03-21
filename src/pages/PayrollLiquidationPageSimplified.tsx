import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Users, RotateCcw, Upload } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { SocialBenefitsDropdown } from '@/components/payroll/SocialBenefitsDropdown';
import { SimplePeriodSelector } from '@/components/payroll/SimplePeriodSelector';
import { AutoSaveIndicator } from '@/components/payroll/AutoSaveIndicator';
import { usePayrollLiquidationSimplified } from '@/hooks/usePayrollLiquidationSimplified';
import { useSimplePeriodSelection } from '@/hooks/useSimplePeriodSelection';
import { EmployeeAddModal } from '@/components/payroll/modals/EmployeeAddModal';
import { NoveltyImportDrawer } from '@/components/payroll/novelties-import/NoveltyImportDrawer';
import { PayrollEmptyState } from '@/components/payroll/liquidation/PayrollEmptyState';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { MayaProvider } from '@/maya/MayaProvider';
import { MayaFloatingAssistant } from '@/maya/MayaFloatingAssistant';
import { MayaIntegratedComponent } from '@/maya/MayaIntegratedComponent';

import { SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { PayrollProgressIndicator } from '@/components/payroll/liquidation/PayrollProgressIndicator';
import { ReliquidationDialog } from '@/components/payroll/liquidation/ReliquidationDialog';
import { PayrollValidationService } from '@/services/PayrollValidationService';
import { PayrollWorldClassControlPanel } from '@/components/payroll/liquidation/PayrollWorldClassControlPanel';
import { PayrollRecoveryPanel } from '@/components/payroll/recovery/PayrollRecoveryPanel';
import { useYear } from '@/contexts/YearContext';
import { PayrollSuccessModal } from '@/components/payroll/modals/PayrollSuccessModal';
import { NewYearConfigurationModal } from '@/components/payroll/modals/NewYearConfigurationModal';
import { EndOfYearDetectionService, EndOfYearSituation } from '@/services/EndOfYearDetectionService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { PayrollSummary } from '@/types/payroll';

const PayrollLiquidationPageSimplified = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showNoveltyImportDrawer, setShowNoveltyImportDrawer] = useState(false);
  
  const [showReliquidationDialog, setShowReliquidationDialog] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [periodSelected, setPeriodSelected] = useState(false);
  const [periodAlreadyLiquidated, setPeriodAlreadyLiquidated] = useState(false);
  const [validationSummary, setValidationSummary] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [liquidationResult, setLiquidationResult] = useState<any>(null);
  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [endOfYearSituation, setEndOfYearSituation] = useState<EndOfYearSituation | null>(null);
  
  const navigate = useNavigate();
  
  const { companyId } = useCurrentCompany();
  const { selectedYear } = useYear();
  
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
    refreshPayrolls,
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

  // Helper: sumar directamente desde payrolls por periodId, con pequeño retry para evitar carrera
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const fetchSummaryFromDB = async (periodId: string, attempt = 1): Promise<PayrollSummary> => {
    const { data, error } = await supabase
      .from('payrolls')
      .select('total_devengado,total_deducciones,neto_pagado')
      .eq('period_id', periodId);

    if (error) {
      console.error('Error fetching payrolls summary:', error);
      if (attempt < 2) {
        await sleep(400);
        return fetchSummaryFromDB(periodId, attempt + 1);
      }
      return {
        totalEmployees: 0,
        validEmployees: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        employerContributions: 0,
        totalPayrollCost: 0,
      };
    }

    const rows = data || [];
    const validEmployees = rows.length;
    const totalGrossPay = rows.reduce((s, r: any) => s + Number(r.total_devengado ?? 0), 0);
    const totalDeductions = rows.reduce((s, r: any) => s + Number(r.total_deducciones ?? 0), 0);
    const totalNetPay = rows.reduce((s, r: any) => s + Number(r.neto_pagado ?? 0), 0);

    // Si aún no hay filas (replicación/actualización), reintentar una vez
    if (validEmployees === 0 && attempt < 2) {
      await sleep(400);
      return fetchSummaryFromDB(periodId, attempt + 1);
    }

    return {
      totalEmployees: validEmployees,
      validEmployees,
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      employerContributions: totalGrossPay * 0.205,
      totalPayrollCost: totalGrossPay + totalGrossPay * 0.205,
    };
  };

  // ✅ MÉTODO SIMPLIFICADO: Solo cargar empleados
  const handlePeriodSelection = async (period: SelectablePeriod) => {
    console.log('🎯 Período seleccionado:', period.label);
    handlePeriodSelect(period);
    setPeriodSelected(true);
    
    // Cargar empleados con el método simplificado
    const loadedPeriodId: string | undefined = await loadEmployees(period.startDate, period.endDate);
    
    // Ejecutar validación automática si está habilitada
    if (useExhaustiveValidation && loadedPeriodId) {
      console.log('🔍 Ejecutando validación automática...');
      await performExhaustiveValidation(loadedPeriodId);
    }
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
      
      // Refrescar empleados desde BD y construir resumen real desde BD
      const loadedPid = await loadEmployees(selectedPeriod.startDate, selectedPeriod.endDate);
      const pid = loadedPid || currentPeriodId || selectedPeriod.id;
      const summary = await fetchSummaryFromDB(pid);

      setLiquidationResult({
        periodData: {
          startDate: selectedPeriod.startDate,
          endDate: selectedPeriod.endDate,
          type: 'mensual'
        },
        summary,
        periodId: pid || selectedPeriod.id,
        companyId: companyId || '',
        employeeCount: employees.length
      });
      setShowSuccessModal(true);
      
      // 🎯 DETECCIÓN DE FIN DE AÑO después de liquidación exitosa
      await checkEndOfYearSituation();
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
      
      // Refrescar empleados y construir resumen real desde BD
      const loadedPid = await loadEmployees(selectedPeriod.startDate, selectedPeriod.endDate);
      const pid = loadedPid || currentPeriodId || selectedPeriod.id;
      const summary = await fetchSummaryFromDB(pid);

      setLiquidationResult({
        periodData: {
          startDate: selectedPeriod.startDate,
          endDate: selectedPeriod.endDate,
          type: 'mensual'
        },
        summary,
        periodId: pid || selectedPeriod.id,
        companyId: companyId || '',
        employeeCount: employees.length
      });
      setShowSuccessModal(true);
      
      // 🎯 DETECCIÓN DE FIN DE AÑO después de re-liquidación exitosa
      await checkEndOfYearSituation();
    } catch (error) {
      console.error('Error en re-liquidación:', error);
    }
  };

  const handleViewResults = () => {
    setShowReliquidationDialog(false);
    // TODO: Implementar navegación a vista de resultados
    console.log('Ver resultados de liquidación...');
  };

  const handleAddEmployees = async (employeeData: Array<{
    id: string; nombre: string; apellido: string;
    cargo: string; salario_base: number; eps?: string; afp?: string;
  }>) => {
    try {
      await addEmployees(employeeData);
      setShowAddEmployeeModal(false);
    } catch (error) {
      console.error('Error adding employees:', error);
      throw error;
    }
  };

  const currentEmployeeIds = useMemo(() => employees.map(emp => emp.id), [employees]);

  const handleReset = () => {
    resetSelection();
    setPeriodSelected(false);
  };

  const handleNavigateToEmployees = () => {
    console.log('🚀 Navegando al módulo de empleados');
    navigate('/modules/employees');
  };

  // 🎯 NUEVA FUNCIÓN: Detectar situación de fin de año
  const checkEndOfYearSituation = async () => {
    if (!companyId) return;
    
    try {
      console.log('🔍 Verificando situación de fin de año...');
      
      const situation = await EndOfYearDetectionService.detectEndOfYearSituation(companyId);
      
      if (situation.needsNewYear) {
        console.log('🎯 Se detectó necesidad de crear nuevo año:', situation);
        setEndOfYearSituation(situation);
        setShowNewYearModal(true);
      }
      
    } catch (error) {
      console.error('❌ Error detectando fin de año:', error);
      // No mostrar error al usuario, es una función auxiliar
    }
  };

  const handleYearCreated = () => {
    console.log('✅ Nuevo año creado exitosamente');
    // El modal se cierra automáticamente
    setShowNewYearModal(false);
    setEndOfYearSituation(null);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    const periodId = liquidationResult?.periodId;
    if (periodId) {
      navigate(`/modules/payroll-history/${periodId}`);
    } else {
      navigate('/modules/payroll-history');
    }
    setLiquidationResult(null);
  };

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Integración con MAYA para tracking inteligente */}
      <MayaIntegratedComponent
        employees={employees}
        isLoading={isLoading}
        isLiquidating={isLiquidating}
        selectedPeriod={selectedPeriod}
        currentPeriodId={currentPeriodId}
        liquidationResult={liquidationResult}
        validationResults={exhaustiveValidationResults}
        isValidating={isValidating}
        liquidationErrors={liquidationErrors}
        companyId={companyId}
      />


      {/* World-Class Control Panel - OCULTO: Validación automática activa
      {periodSelected && selectedPeriod && (
        <PayrollWorldClassControlPanel
          exhaustiveValidationResults={exhaustiveValidationResults}
          isValidating={isValidating}
          onPerformExhaustiveValidation={async () => { await performExhaustiveValidation(); }}
          onAutoRepairIssues={async () => { await autoRepairValidationIssues(); }}
          canProceedWithLiquidation={canProceedWithLiquidation}
          showProgress={showProgress}
          liquidationProgress={liquidationProgress}
          liquidationStep={liquidationStep}
        />
      )}
      */}

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

      {/* ✅ INFORMACIÓN ARQUITECTÓNICA - OCULTO: Banner técnico removido para UI más limpia
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
      */}

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
              <div className="flex items-center gap-2">
                <SocialBenefitsDropdown
                  companyId={companyId || ''}
                  employees={employees}
                  disabled={isLoading || isLiquidating}
                  activeYear={selectedPeriod ? Number(selectedPeriod.startDate.slice(0, 4)) : undefined}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-green-700 border-green-200 hover:bg-green-100"
                >
                  Cambiar Período
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vacío cuando hay período seleccionado pero sin empleados */}
      {selectedPeriod && periodSelected && employees.length === 0 && !isLoadingEmployees && (
        <Card>
          <CardContent className="p-0">
            <PayrollEmptyState
              periodLabel={selectedPeriod.label}
              onNavigateToEmployees={handleNavigateToEmployees}
              onAddEmployee={currentPeriodId ? () => setShowAddEmployeeModal(true) : undefined}
            />
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
                  onClick={() => setShowNoveltyImportDrawer(true)}
                  variant="outline"
                  disabled={isLoading || !currentPeriodId || isRemovingEmployee}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Novedades
                </Button>
                <Button 
                  onClick={handleLiquidate}
                  disabled={isLiquidating || !canProceedWithLiquidation || isRemovingEmployee || (useExhaustiveValidation && !exhaustiveValidationResults?.canProceed)}
                  className={periodAlreadyLiquidated ? "bg-orange-600 hover:bg-orange-700" : ""}
                >
                  {isLiquidating ? 'Liquidando...' : periodAlreadyLiquidated ? 'Re-liquidar' : 'Liquidar nómina'}
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
              year={selectedPeriod?.startDate?.split('-')[0] || selectedYear}
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

      <EmployeeAddModal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        onAddEmployees={handleAddEmployees}
        currentEmployeeIds={currentEmployeeIds}
        companyId={companyId || ''}
        periodEndDate={selectedPeriod?.endDate}
      />

      <NoveltyImportDrawer
        isOpen={showNoveltyImportDrawer}
        onClose={() => setShowNoveltyImportDrawer(false)}
        companyId={companyId || ''}
        periodId={currentPeriodId || ''}
        periodStartDate={selectedPeriod?.startDate || ''}
        periodEndDate={selectedPeriod?.endDate || ''}
        onImportComplete={() => {
          console.log('✅ Import completed, refreshing employees...');
          if (selectedPeriod) {
            loadEmployees(selectedPeriod.startDate, selectedPeriod.endDate);
          }
        }}
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

      {/* Success Modal */}
      {showSuccessModal && liquidationResult && (
        <PayrollSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          periodData={liquidationResult.periodData}
          summary={liquidationResult.summary}
          periodId={liquidationResult.periodId}
          companyId={liquidationResult.companyId}
          employeeCount={liquidationResult.employeeCount}
        />
      )}

      {/* New Year Configuration Modal */}
      {showNewYearModal && endOfYearSituation && (
        <NewYearConfigurationModal
          isOpen={showNewYearModal}
          onClose={() => setShowNewYearModal(false)}
          endOfYearSituation={endOfYearSituation}
          onYearCreated={handleYearCreated}
        />
      )}

    </div>
  );
};

export default PayrollLiquidationPageSimplified;
