
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePayrollLiquidationSimplified } from '@/hooks/usePayrollLiquidationSimplified';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { PayrollProgressIndicator } from '@/components/payroll/liquidation/PayrollProgressIndicator';
import { EmployeeFormModal } from '@/components/employees/EmployeeFormModal';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { Plus, Zap } from 'lucide-react';

export default function PayrollLiquidationPageSimplified() {
  const hookData = usePayrollLiquidationSimplified();
  
  // Destructure with proper fallbacks
  const {
    employees = [],
    isLoading = false,
    liquidationProgress = 0,
    error = null,
    currentPeriod = null,
    liquidationStep = 'idle',
    liquidatePayroll,
    removeEmployee,
    updateEmployeeCalculationsInDB
  } = hookData;

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // Create a mock activePeriod for compatibility
  const activePeriod = currentPeriod ? {
    id: currentPeriod,
    period: currentPeriod,
    startDate: currentPeriod.split('-')[0] || '',
    endDate: currentPeriod.split('-')[1] || ''
  } : null;

  const handleAtomicLiquidation = async () => {
    console.log('🚀 Iniciando liquidación atómica...');
    
    if (!activePeriod?.id) {
      console.error('❌ No hay período activo');
      return;
    }

    try {
      // Perform exhaustive validation with proper parameters
      const validation = await EmployeeUnifiedService.performExhaustiveValidation(activePeriod.id);
      
      if (!validation.success) {
        console.error('❌ Error en validación:', validation.message);
        return;
      }

      await liquidatePayroll(activePeriod.startDate, activePeriod.endDate);
      console.log('✅ Liquidación completada');
    } catch (error) {
      console.error('💥 Error en liquidación atómica:', error);
    }
  };

  // Create progress indicator props
  const progressProps = {
    currentStep: liquidationStep,
    totalEmployees: employees.length,
    processedEmployees: Math.floor(liquidationProgress / 100 * employees.length),
    progress: liquidationProgress,
    errors: []
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Liquidación de Nómina</CardTitle>
          <CardDescription>
            Gestiona y procesa la nómina para el período activo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Período Activo */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900">Período Activo</h3>
            <p className="text-blue-700">
              {activePeriod ? activePeriod.period : 'No hay período activo'}
            </p>
            {activePeriod && (
              <p className="text-sm text-blue-600">
                {activePeriod.startDate} - {activePeriod.endDate}
              </p>
            )}
          </div>

          {/* Progreso de Liquidación */}
          <PayrollProgressIndicator 
            {...progressProps}
            isVisible={liquidationStep !== 'idle'}
          />

          {/* Acciones */}
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={() => setShowEmployeeModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar Empleado
            </Button>
            
            <Button 
              onClick={handleAtomicLiquidation}
              disabled={isLoading || !employees.length}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Liquidar (Atómico)
            </Button>
          </div>

          {/* Tabla de Empleados */}
          {error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded-lg">
              Error: {error}
            </div>
          ) : (
            <PayrollLiquidationTable
              employees={employees}
              onUpdateEmployee={updateEmployeeCalculationsInDB}
              onRemoveEmployee={removeEmployee}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal de Empleado */}
      <EmployeeFormModal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        onSuccess={() => {
          setShowEmployeeModal(false);
          // Refresh employees list if needed
        }}
      />
    </div>
  );
}
