
import { useState } from 'react';
import { PaymentsHeader } from './PaymentsHeader';
import { PaymentsFilters } from './PaymentsFilters';
import { PaymentsSummaryCards } from './PaymentsSummaryCards';
import { PaymentsTable } from './PaymentsTable';
import { BankFileGenerator } from './BankFileGenerator';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { RetryPaymentModal } from './RetryPaymentModal';
import { PaymentEmployee, PaymentFilters, PaymentPeriod } from '@/types/payments';
import { usePayments } from '@/hooks/usePayments';

// Mock data
const mockPaymentPeriod: PaymentPeriod = {
  id: '1',
  periodName: '1 al 15 de junio de 2025',
  startDate: '2025-06-01',
  endDate: '2025-06-15',
  status: 'processing',
  totalEmployees: 45,
  totalAmount: 85420000,
  totalPaid: 65320000,
  totalFailed: 3250000,
  createdAt: '2025-06-15T10:00:00Z',
  updatedAt: '2025-06-16T14:30:00Z'
};

const mockPaymentEmployees: PaymentEmployee[] = [
  {
    id: '1',
    employeeId: 'emp1',
    name: 'María González',
    position: 'Desarrolladora Senior',
    bankName: 'Bancolombia',
    accountType: 'ahorros',
    accountNumber: '12345678901',
    netPay: 3500000,
    paymentStatus: 'pagado',
    paymentMethod: 'transferencia',
    paymentDate: '2025-06-16',
    confirmedBy: 'admin@empresa.com',
    costCenter: 'Tecnología'
  },
  {
    id: '2',
    employeeId: 'emp2',
    name: 'Carlos Rodríguez',
    position: 'Analista Financiero',
    bankName: 'Banco de Bogotá',
    accountType: 'corriente',
    accountNumber: '987654321',
    netPay: 2800000,
    paymentStatus: 'fallido',
    paymentMethod: 'transferencia',
    errorReason: 'Cuenta inválida',
    costCenter: 'Finanzas'
  },
  {
    id: '3',
    employeeId: 'emp3',
    name: 'Ana Martínez',
    position: 'Gerente de Ventas',
    bankName: 'Davivienda',
    accountType: 'ahorros',
    accountNumber: '5555666677',
    netPay: 4200000,
    paymentStatus: 'pendiente',
    paymentMethod: 'transferencia',
    costCenter: 'Ventas'
  }
];

export const PaymentsPage = () => {
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [employees, setEmployees] = useState(mockPaymentEmployees);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showBankFileGenerator, setShowBankFileGenerator] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showRetryPayment, setShowRetryPayment] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PaymentEmployee | null>(null);

  const {
    markEmployeeAsPaid,
    markMultipleAsPaid,
    retryPayment,
    updateBankAccount,
    downloadPaymentReport
  } = usePayments();

  // Verificar empleados sin datos bancarios
  const employeesWithoutBankData = employees.filter(emp => 
    !emp.bankName || !emp.accountNumber
  );

  // Filtrar empleados
  const filteredEmployees = employees.filter(employee => {
    if (filters.paymentStatus && employee.paymentStatus !== filters.paymentStatus) return false;
    if (filters.bankName && employee.bankName !== filters.bankName) return false;
    if (filters.costCenter && employee.costCenter !== filters.costCenter) return false;
    return true;
  });

  // Calcular resumen
  const summary = {
    totalEmployees: filteredEmployees.length,
    totalAmount: filteredEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
    totalPaid: filteredEmployees.filter(emp => emp.paymentStatus === 'pagado').reduce((sum, emp) => sum + emp.netPay, 0),
    totalFailed: filteredEmployees.filter(emp => emp.paymentStatus === 'fallido').reduce((sum, emp) => sum + emp.netPay, 0),
    paidCount: filteredEmployees.filter(emp => emp.paymentStatus === 'pagado').length,
    failedCount: filteredEmployees.filter(emp => emp.paymentStatus === 'fallido').length,
    progressPercentage: filteredEmployees.length > 0 ? Math.round((filteredEmployees.filter(emp => emp.paymentStatus === 'pagado').length / filteredEmployees.length) * 100) : 0
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
      setEmployees(prev => prev.map(emp => 
        emp.id === selectedEmployee.id 
          ? { ...emp, paymentStatus: 'pagado', paymentDate: confirmation.paymentDate, confirmedBy: confirmation.confirmedBy, observations: confirmation.observations }
          : emp
      ));
      setShowPaymentConfirmation(false);
      setSelectedEmployee(null);
    }
  };

  const handleUpdateBankAccount = async (employeeId: string, accountData: any) => {
    const success = await updateBankAccount(employeeId, accountData);
    if (success) {
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, ...accountData, paymentStatus: 'pendiente', errorReason: undefined }
          : emp
      ));
    }
    return success;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PaymentsHeader 
          period={mockPaymentPeriod}
          onDownloadReport={() => downloadPaymentReport(mockPaymentPeriod.id)}
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
          onFiltersChange={setFilters}
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
            >
              Generar archivo bancario
            </button>
          </div>
        </div>

        {/* Tabla de empleados */}
        <PaymentsTable 
          employees={filteredEmployees}
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
          employees={filteredEmployees.filter(emp => emp.paymentStatus !== 'pagado')}
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
