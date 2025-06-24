
import { useState } from 'react';
import { PaymentsHeader } from './PaymentsHeader';
import { PaymentsFilters } from './PaymentsFilters';
import { PaymentsSummaryCards } from './PaymentsSummaryCards';
import { PaymentsTable } from './PaymentsTable';
import { BankFileGenerator } from './BankFileGenerator';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { RetryPaymentModal } from './RetryPaymentModal';
import { PaymentEmployee, PaymentFilters } from '@/types/payments';
import { usePayments } from '@/hooks/usePayments';
import { LoadingState } from '@/components/ui/LoadingState';

export const PaymentsPage = () => {
  const {
    employees,
    currentPeriod,
    isLoading,
    filters,
    updateFilters,
    markEmployeeAsPaid,
    markMultipleAsPaid,
    retryPayment,
    updateBankAccount,
    downloadPaymentReport
  } = usePayments();

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showBankFileGenerator, setShowBankFileGenerator] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showRetryPayment, setShowRetryPayment] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PaymentEmployee | null>(null);

  if (isLoading) {
    return <LoadingState message="Cargando datos de pagos..." className="h-64" />;
  }

  // Verificar empleados sin datos bancarios
  const employeesWithoutBankData = employees.filter(emp => 
    emp.bankName === 'Por configurar' || emp.accountNumber === 'Por configurar'
  );

  // Calcular resumen
  const summary = {
    totalEmployees: employees.length,
    totalAmount: employees.reduce((sum, emp) => sum + emp.netPay, 0),
    totalPaid: employees.filter(emp => emp.paymentStatus === 'pagado').reduce((sum, emp) => sum + emp.netPay, 0),
    totalFailed: employees.filter(emp => emp.paymentStatus === 'fallido').reduce((sum, emp) => sum + emp.netPay, 0),
    paidCount: employees.filter(emp => emp.paymentStatus === 'pagado').length,
    failedCount: employees.filter(emp => emp.paymentStatus === 'fallido').length,
    progressPercentage: employees.length > 0 ? Math.round((employees.filter(emp => emp.paymentStatus === 'pagado').length / employees.length) * 100) : 0
  };

  const handleMarkAsPaid = (employee: PaymentEmployee) => {
    setSelectedEmployee(employee);
    setShowPaymentConfirmation(true);
  };

  const handleRetryPayment = (employee: PaymentEmployee) => {
    setSelectedEmployee(employee);
    setShowRetryPayment(true);
  };

  const handleConfirmPayment = async (confirmation: any) => {
    if (!selectedEmployee) return;
    
    const success = await markEmployeeAsPaid(selectedEmployee.id, confirmation);
    if (success) {
      setShowPaymentConfirmation(false);
      setSelectedEmployee(null);
    }
  };

  const handleUpdateBankAccount = async (employeeId: string, accountData: any) => {
    const success = await updateBankAccount(employeeId, accountData);
    return success;
  };

  // Si no hay período actual, mostrar mensaje
  if (!currentPeriod) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay nóminas procesadas para pagar
            </h3>
            <p className="text-gray-600">
              Primero debes procesar una liquidación de nómina en el módulo de Liquidar Nómina.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PaymentsHeader 
          period={currentPeriod}
          onDownloadReport={() => downloadPaymentReport(currentPeriod.id)}
        />

        {/* Alerta de empleados sin datos bancarios */}
        {employeesWithoutBankData.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-amber-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-amber-800">
                  Empleados sin datos bancarios
                </h3>
                <p className="text-sm text-amber-700">
                  {employeesWithoutBankData.length} empleados no tienen información bancaria completa
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <PaymentsFilters 
          filters={filters}
          onFiltersChange={updateFilters}
          employees={employees}
        />

        {/* Tarjetas de resumen */}
        <PaymentsSummaryCards summary={summary} />

        {/* Botón para generar archivo bancario */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Empleados a pagar</h2>
          <div className="space-x-3">
            <button
              onClick={() => setShowBankFileGenerator(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              disabled={employees.filter(emp => emp.paymentStatus !== 'pagado').length === 0}
            >
              Generar archivo bancario
            </button>
          </div>
        </div>

        {/* Tabla de empleados */}
        <PaymentsTable 
          employees={employees}
          selectedEmployees={selectedEmployees}
          onSelectionChange={setSelectedEmployees}
          onMarkAsPaid={handleMarkAsPaid}
          onRetryPayment={handleRetryPayment}
          onUpdateBankAccount={handleUpdateBankAccount}
        />

        {/* Modales */}
        <BankFileGenerator
          isOpen={showBankFileGenerator}
          onClose={() => setShowBankFileGenerator(false)}
          employees={employees.filter(emp => emp.paymentStatus !== 'pagado')}
        />

        <PaymentConfirmationModal
          isOpen={showPaymentConfirmation}
          onClose={() => {
            setShowPaymentConfirmation(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onConfirm={handleConfirmPayment}
        />

        <RetryPaymentModal
          isOpen={showRetryPayment}
          onClose={() => {
            setShowRetryPayment(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onRetry={retryPayment}
          onUpdateAccount={handleUpdateBankAccount}
        />
      </div>
    </div>
  );
};
