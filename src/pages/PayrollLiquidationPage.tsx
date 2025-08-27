
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Users, Loader2, Settings, Bug } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { SimplePeriodSelector } from '@/components/payroll/SimplePeriodSelector';
import { AutoSaveIndicator } from '@/components/payroll/AutoSaveIndicator';
import { PayrollDiagnosticPanel } from '@/components/payroll/diagnostic/PayrollDiagnosticPanel';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { useSimplePeriodSelection } from '@/hooks/useSimplePeriodSelection';
import { EmployeeAddModal } from '@/components/payroll/modals/EmployeeAddModal';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

import { PeriodCleanupDialog } from '@/components/payroll/PeriodCleanupDialog';
import { PayrollSuccessModal } from '@/components/payroll/modals/PayrollSuccessModal';
import { SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { useNavigate } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';

const PayrollLiquidationPage = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [periodSelected, setPeriodSelected] = useState(false);
  
  const { companyId } = useCurrentCompany();
  const navigate = useNavigate();
  const { selectedYear } = useYear();
  
  const {
    employees,
    isLoading,
    isLiquidating,
    currentPeriodId,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    isAutoSaving,
    lastAutoSaveTime,
    isRemovingEmployee,
    // ✅ NUEVO: Estado del modal de éxito
    showSuccessModal,
    liquidationResult,
    closeSuccessModal
  } = usePayrollLiquidation();

  const {
    selectedPeriod,
    handlePeriodSelect,
    resetSelection,
    markCurrentPeriodAsLiquidated
  } = useSimplePeriodSelection(companyId || '');


  const handlePeriodSelection = async (period: SelectablePeriod) => {
    console.log('🎯 Período seleccionado desde UI:', period.label);
    handlePeriodSelect(period);
    setPeriodSelected(true);
    
    // Cargar empleados automáticamente
    await loadEmployees(period.startDate, period.endDate);
  };

  const handleLiquidate = async () => {
    if (!selectedPeriod || employees.length === 0) {
      return;
    }

    const confirmMessage = `¿Deseas cerrar este periodo de nómina y generar los comprobantes de pago?\n\nPeríodo: ${selectedPeriod.label}\nEmpleados: ${employees.length}`;
    
    if (window.confirm(confirmMessage)) {
      await liquidatePayroll(selectedPeriod.startDate, selectedPeriod.endDate);
      await markCurrentPeriodAsLiquidated();
    }
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

  const handleSuccessModalClose = () => {
    closeSuccessModal();
    navigate('/app/dashboard');
  };

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Liquidación de Nómina</h1>
          {isRemovingEmployee && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Eliminando empleado...</span>
            </div>
          )}
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

      <Tabs defaultValue="liquidation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="liquidation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Liquidación
          </TabsTrigger>
          <TabsTrigger value="diagnostic" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Diagnóstico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="liquidation" className="space-y-6">
          {/* Selector de Período Simplificado */}
          {companyId && !periodSelected && (
            <SimplePeriodSelector
              companyId={companyId}
              onPeriodSelected={handlePeriodSelection}
              disabled={isRemovingEmployee}
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
                      disabled={isLiquidating || employees.length === 0 || isRemovingEmployee}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLiquidating ? 'Liquidando...' : 'Liquidar Nómina'}
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
                  onRemoveEmployee={removeEmployee}
                  onEmployeeNovedadesChange={refreshEmployeeNovedades}
                  year={selectedYear}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="diagnostic">
          <PayrollDiagnosticPanel />
        </TabsContent>
      </Tabs>

      {/* Period Cleanup Dialog */}
      <PeriodCleanupDialog
        isOpen={showCleanupDialog}
        onClose={() => setShowCleanupDialog(false)}
        onCleanupComplete={() => {
          // Opcional: recargar períodos si es necesario
        }}
      />

      {/* Add Employee Modal */}
      <EmployeeAddModal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        onAddEmployees={handleAddEmployees}
        currentEmployeeIds={employees.map(emp => emp.id)}
        companyId={companyId || ''}
      />

      {/* Success Modal */}
      {showSuccessModal && liquidationResult && (
        <PayrollSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          periodData={liquidationResult.periodData}
          summary={liquidationResult.summary}
        />
      )}
    </div>
  );
};

export default PayrollLiquidationPage;
