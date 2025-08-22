import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Users, Loader2 } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { SimplePeriodSelector } from '@/components/payroll/SimplePeriodSelector';
import { EmployeeAddModal } from '@/components/payroll/modals/EmployeeAddModal';
import { PayrollSuccessModal } from '@/components/payroll/modals/PayrollSuccessModal';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { useNavigate } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';

const PayrollLiquidationPageSimple = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectablePeriod | null>(null);
  
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
    showSuccessModal,
    liquidationResult,
    closeSuccessModal
  } = usePayrollLiquidation();

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
        />
      )}
    </div>
  );
};

export default PayrollLiquidationPageSimple;
