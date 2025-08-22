import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Users, Loader2 } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { SimplePeriodSelector } from '@/components/payroll/SimplePeriodSelector';
import { EmployeeAddModal } from '@/components/payroll/modals/EmployeeAddModal';
import { PayrollSuccessModal } from '@/components/payroll/modals/PayrollSuccessModal';
import { PayrollPeriodGuard } from '@/components/payroll/PayrollPeriodGuard';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { useNavigate } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PayrollLiquidationPageSimple = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectablePeriod | null>(null);
  const [hideZeroNetPeriods, setHideZeroNetPeriods] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  
  const { companyId } = useCurrentCompany();
  const navigate = useNavigate();
  const { selectedYear } = useYear();
  const { toast } = useToast();
  
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
    showSuccessModal,
    liquidationResult,
    closeSuccessModal
  } = usePayrollLiquidation();

  // ✅ NUEVA FUNCIÓN: Limpiar borradores vacíos
  const handleCleanupEmptyDrafts = async () => {
    if (!companyId) return;
    
    try {
      console.log('🧹 Limpiando borradores vacíos...');
      
      // Buscar borradores vacíos
      const { data: emptyDrafts, error: fetchError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .or('total_neto.eq.0,empleados_count.eq.0');
      
      if (fetchError) throw fetchError;
      
      if (!emptyDrafts || emptyDrafts.length === 0) {
        toast({
          title: "No hay borradores vacíos",
          description: "No se encontraron períodos en borrador para limpiar",
          className: "border-blue-200 bg-blue-50"
        });
        return;
      }
      
      const confirmed = window.confirm(
        `¿Deseas eliminar ${emptyDrafts.length} borradores vacíos?\n\n` +
        emptyDrafts.slice(0, 3).map(p => `• ${p.periodo}`).join('\n') +
        (emptyDrafts.length > 3 ? `\n... y ${emptyDrafts.length - 3} más` : '')
      );
      
      if (!confirmed) return;
      
      // Eliminar borradores vacíos
      const { error: deleteError } = await supabase
        .from('payroll_periods_real')
        .delete()
        .in('id', emptyDrafts.map(p => p.id));
      
      if (deleteError) throw deleteError;
      
      toast({
        title: "✅ Limpieza Completada",
        description: `Se eliminaron ${emptyDrafts.length} borradores vacíos`,
        className: "border-green-200 bg-green-50"
      });
      
      // Recargar períodos si es necesario
      // (esto se puede mejorar con un callback desde SimplePeriodSelector)
      
    } catch (error) {
      console.error('❌ Error limpiando borradores:', error);
      toast({
        title: "❌ Error",
        description: "No se pudieron limpiar los borradores vacíos",
        variant: "destructive"
      });
    }
  };

  const handlePeriodSelection = async (period: SelectablePeriod & { year?: string }) => {
    console.log('🎯 Período seleccionado:', period.label, 'Año:', period.year);
    setSelectedPeriod(period);
    // ✅ NUEVO: Pasar el año al cargar empleados
    await loadEmployees(period.startDate, period.endDate, period.year);
  };

  const handleLiquidate = async () => {
    if (!selectedPeriod || employees.length === 0) {
      return;
    }

    // ✅ VALIDACIÓN MEJORADA: Verificar datos antes de confirmar
    const employeesWithErrors = employees.filter(emp => 
      !emp.salario_base && !emp.baseSalary ||
      !emp.dias_trabajados && !emp.worked_days
    );
    
    if (employeesWithErrors.length > 0) {
      toast({
        title: "❌ Datos Incompletos",
        description: `${employeesWithErrors.length} empleados tienen datos faltantes. Revisa los salarios base y días trabajados.`,
        variant: "destructive"
      });
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

  const handleSuccessModalClose = () => {
    closeSuccessModal();
    navigate('/app/dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Liquidación de Nómina</h1>
        </div>
      </div>

      {/* ✅ NUEVO: Componente de guardia para períodos */}
      {companyId && (
        <PayrollPeriodGuard
          periods={periods}
          onCleanupEmptyDrafts={handleCleanupEmptyDrafts}
          hideZeroNetPeriods={hideZeroNetPeriods}
          onToggleZeroNetFilter={setHideZeroNetPeriods}
        />
      )}

      {companyId && !selectedPeriod && (
        <SimplePeriodSelector
          companyId={companyId}
          onPeriodSelected={handlePeriodSelection}
          disabled={isLoading}
        />
      )}

      {selectedPeriod && (
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

      {isLoading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-blue-800 font-medium">Cargando empleados...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {employees.length > 0 && selectedPeriod && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Empleados a Liquidar ({employees.length})</CardTitle>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowAddEmployeeModal(true)}
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Agregar Empleado
                </Button>
                <Button 
                  onClick={handleLiquidate}
                  disabled={employees.length === 0 || isLiquidating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLiquidating ? 'Liquidando...' : 'Liquidar Periodo'}
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

      <EmployeeAddModal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        onAddEmployees={handleAddEmployees}
        currentEmployeeIds={employees.map(emp => emp.id)}
        companyId={companyId || ''}
      />

      {showSuccessModal && liquidationResult && (
        <PayrollSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          periodData={liquidationResult.periodData}
          summary={liquidationResult.summary}
          periodId={liquidationResult.periodId}
        />
      )}
    </div>
  );
};

export default PayrollLiquidationPageSimple;
