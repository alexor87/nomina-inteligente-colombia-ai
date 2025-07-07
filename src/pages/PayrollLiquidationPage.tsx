import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Calculator, Loader2, Settings, Bug } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { PeriodInfoPanel } from '@/components/payroll/liquidation/PeriodInfoPanel';
import { AutoSaveIndicator } from '@/components/payroll/AutoSaveIndicator';
import { PayrollDiagnosticPanel } from '@/components/payroll/diagnostic/PayrollDiagnosticPanel';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { usePeriodDetection } from '@/hooks/usePeriodDetection';
import { format } from 'date-fns';
import { EmployeeAddModal } from '@/components/payroll/modals/EmployeeAddModal';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { PayrollCleanupService } from '@/services/PayrollCleanupService';
import { PeriodCleanupDialog } from '@/components/payroll/PeriodCleanupDialog';

const PayrollLiquidationPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showPeriodInfo, setShowPeriodInfo] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  
  const { companyId } = useCurrentCompany();
  
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
    // Auto-save properties
    isAutoSaving,
    lastAutoSaveTime,
    triggerManualSave,
    // New removal status
    isRemovingEmployee
  } = usePayrollLiquidation();

  const {
    periodInfo,
    isDetecting,
    error: detectionError,
    detectPeriod,
    reset: resetDetection
  } = usePeriodDetection();

  // Ejecutar limpieza cuando se monta el componente
  useEffect(() => {
    const performInitialCleanup = async () => {
      await PayrollCleanupService.cleanupAbandonedPeriods();
    };
    
    performInitialCleanup();
  }, []);

  // Auto-detect period when both dates are selected
  useEffect(() => {
    if (startDate && endDate && !showPeriodInfo) {
      console.log('📅 Fechas completas, iniciando detección automática para fechas seleccionadas...');
      setShowPeriodInfo(true);
      detectPeriod(startDate, endDate);
    }
  }, [startDate, endDate, showPeriodInfo, detectPeriod]);

  // Reset when dates change
  useEffect(() => {
    if (!startDate || !endDate) {
      setShowPeriodInfo(false);
      resetDetection();
    }
  }, [startDate, endDate, resetDetection]);

  const handleProceedWithPeriod = async () => {
    if (!startDate || !endDate) {
      alert('Por favor selecciona las fechas del período');
      return;
    }
    
    console.log('🚀 Procediendo con la carga de empleados para fechas:', { startDate, endDate });
    await loadEmployees(startDate, endDate);
  };

  const handleResolveConflict = async (action: 'selected' | 'existing') => {
    if (action === 'selected') {
      // Continuar con las fechas seleccionadas por el usuario
      console.log('👤 Usuario eligió continuar con fechas seleccionadas:', { startDate, endDate });
      await loadEmployees(startDate, endDate);
    } else if (action === 'existing' && periodInfo?.conflictPeriod) {
      // Cambiar a las fechas del período existente
      const existingStart = periodInfo.conflictPeriod.fecha_inicio;
      const existingEnd = periodInfo.conflictPeriod.fecha_fin;
      
      console.log('📋 Usuario eligió abrir período existente:', { existingStart, existingEnd });
      
      // Actualizar las fechas en el estado
      setStartDate(existingStart);
      setEndDate(existingEnd);
      
      // Cargar empleados con las fechas del período existente
      await loadEmployees(existingStart, existingEnd);
    }
  };

  const handleLiquidate = async () => {
    if (employees.length === 0) {
      alert('No hay empleados para liquidar');
      return;
    }

    const confirmMessage = `¿Deseas cerrar este periodo de nómina y generar los comprobantes de pago?\n\nPeríodo: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}\nEmpleados: ${employees.length}`;
    
    if (window.confirm(confirmMessage)) {
      await liquidatePayroll(startDate, endDate);
    }
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setStartDate(value);
      // Reset end date if start date is after current end date
      if (endDate && new Date(value) > new Date(endDate)) {
        setEndDate('');
      }
    } else {
      setEndDate(value);
    }
  };

  const handleAddEmployees = async (employeeIds: string[]) => {
    try {
      await addEmployees(employeeIds);
      setShowAddEmployeeModal(false);
    } catch (error) {
      console.error('Error adding employees:', error);
      // Error handling is done in the hook
    }
  };

  return (
    <div className="space-y-6">
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
          {/* Auto-save indicator */}
          {employees.length > 0 && (
            <AutoSaveIndicator 
              isSaving={isAutoSaving}
              lastSaveTime={lastAutoSaveTime}
            />
          )}
          
          {/* Cleanup button */}
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
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Seleccionar Período</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Fecha desde</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    disabled={isRemovingEmployee}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha hasta</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    disabled={isRemovingEmployee}
                  />
                </div>
              </div>
              
              {detectionError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {detectionError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Period Information Panel */}
          {showPeriodInfo && periodInfo && (
            <PeriodInfoPanel
              periodInfo={periodInfo}
              employeesCount={0} // This will be updated after period detection
              isLoading={isDetecting}
              startDate={startDate}
              endDate={endDate}
              onProceed={handleProceedWithPeriod}
              onResolveConflict={handleResolveConflict}
            />
          )}

          {/* Legacy fallback button - only show if period info is not available */}
          {startDate && endDate && !showPeriodInfo && !isDetecting && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-center">
                  <Button 
                    onClick={handleProceedWithPeriod} 
                    disabled={isLoading || isRemovingEmployee}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {isLoading ? 'Cargando...' : 'Cargar Empleados'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee Table */}
          {employees.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <CardTitle>Empleados a Liquidar ({employees.length})</CardTitle>
                    {/* Additional save indicator in header */}
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
                  startDate={startDate}
                  endDate={endDate}
                  currentPeriodId={currentPeriodId}
                  onRemoveEmployee={removeEmployee}
                  onEmployeeNovedadesChange={refreshEmployeeNovedades}
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
          // Refresh period detection after cleanup
          if (startDate && endDate) {
            detectPeriod(startDate, endDate);
          }
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
    </div>
  );
};

export default PayrollLiquidationPage;
