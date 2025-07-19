import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Users, Loader2, AlertTriangle } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { SimplePeriodSelector } from '@/components/payroll/SimplePeriodSelector';
import { EmployeeAddModal } from '@/components/payroll/modals/EmployeeAddModal';
import { ConflictResolutionPanel } from '@/components/vacation-integration/ConflictResolutionPanel';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { usePayrollLiquidationWithVacations } from '@/hooks/usePayrollLiquidationWithVacations';
import { SelectablePeriod } from '@/services/payroll/SimplePeriodService';

const PayrollLiquidationPageSimple = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectablePeriod | null>(null);
  
  const { companyId } = useCurrentCompany();
  
  const {
    currentPeriod,
    employees,
    isLoading,
    isLiquidating,
    loadEmployees,
    loadEmployeesWithVacations,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    currentPeriodId,
    
    // Propiedades para conflictos
    conflictDetectionStep,
    conflictReport,
    hasConflicts,
    isDetectingConflicts,
    isResolvingConflicts,
    resolveConflictsAndContinue,
    cancelConflictResolution,
    canProceedWithLiquidation,
    needsConflictResolution,
    isLoadingWithConflicts
  } = usePayrollLiquidationWithVacations(companyId || '');

  const handlePeriodSelection = async (period: SelectablePeriod) => {
    console.log('🎯 Período seleccionado:', period.label);
    setSelectedPeriod(period);
    
    // ✅ USAR EL MÉTODO CON INTEGRACIÓN AUTOMÁTICA DE VACACIONES
    await loadEmployeesWithVacations(period.startDate, period.endDate);
  };

  const handleLiquidate = async () => {
    if (!selectedPeriod || employees.length === 0 || !canProceedWithLiquidation) {
      return;
    }

    const confirmMessage = `¿Deseas cerrar este periodo de nómina y generar los comprobantes de pago?\n\nPeríodo: ${selectedPeriod.label}\nEmpleados: ${employees.length}`;
    
    if (window.confirm(confirmMessage)) {
      await liquidatePayroll(selectedPeriod.startDate, selectedPeriod.endDate);
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
    setSelectedPeriod(null);
  };

  const handleConflictResolution = async (resolutions: any[]) => {
    if (!selectedPeriod) return;
    
    await resolveConflictsAndContinue(
      resolutions,
      selectedPeriod.startDate,
      selectedPeriod.endDate
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Liquidación de Nómina</h1>
          {isLoadingWithConflicts && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                {isDetectingConflicts ? 'Detectando conflictos...' : 'Cargando...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Selector de Período */}
      {companyId && !selectedPeriod && !needsConflictResolution && (
        <SimplePeriodSelector
          companyId={companyId}
          onPeriodSelected={handlePeriodSelection}
          disabled={isLoading || isLoadingWithConflicts}
        />
      )}

      {/* Panel de Resolución de Conflictos */}
      {needsConflictResolution && conflictReport && (
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-medium text-orange-800">Resolución de Conflictos Requerida</h3>
                  <p className="text-orange-700 text-sm">
                    Período: {selectedPeriod?.label} - Se detectaron conflictos entre ausencias y novedades
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ConflictResolutionPanel
            conflictReport={conflictReport}
            onResolveConflicts={handleConflictResolution}
            onCancel={cancelConflictResolution}
            isResolving={isResolvingConflicts}
          />
        </div>
      )}

      {/* Información del Período Seleccionado */}
      {selectedPeriod && currentPeriod && !needsConflictResolution && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-800">Período Activo</h3>
                <p className="text-green-700">{selectedPeriod.label}</p>
                <p className="text-sm text-green-600">ID: {currentPeriod.id}</p>
                {conflictDetectionStep === 'completed' && (
                  <p className="text-xs text-green-500 mt-1">
                    ✅ Sin conflictos detectados entre ausencias y novedades
                  </p>
                )}
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

      {/* Loading State */}
      {(isLoading || isLoadingWithConflicts) && !needsConflictResolution && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {isDetectingConflicts ? 'Detectando conflictos entre ausencias y novedades...' : 'Cargando empleados...'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Empleados */}
      {employees.length > 0 && selectedPeriod && currentPeriod && canProceedWithLiquidation && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Empleados a Liquidar ({employees.length})</CardTitle>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowAddEmployeeModal(true)}
                  variant="outline"
                  disabled={isLoading || !currentPeriodId}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Agregar Empleado
                </Button>
                <Button 
                  onClick={handleLiquidate}
                  disabled={isLiquidating || employees.length === 0 || !canProceedWithLiquidation}
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
            />
          </CardContent>
        </Card>
      )}

      {/* Add Employee Modal */}
      <EmployeeAddModal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        onAddEmployees={handleAddEmployees}
        currentEmployeeIds={employees.map(emp => emp.id)}
        companyId={companyId || ''}
      />
    </div>
  );
};

export default PayrollLiquidationPageSimple;
