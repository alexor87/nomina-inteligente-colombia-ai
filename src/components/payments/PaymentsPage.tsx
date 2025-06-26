
import { useState } from 'react';
import { PaymentsHeader } from './PaymentsHeader';
import { PaymentsFilters } from './PaymentsFilters';
import { PaymentsSummaryCards } from './PaymentsSummaryCards';
import { PaymentsTable } from './PaymentsTable';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { RetryPaymentModal } from './RetryPaymentModal';
import { BankFileGenerator } from './BankFileGenerator';
import { usePayments } from '@/hooks/usePayments';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const PaymentsPage = () => {
  const {
    employees,
    currentPeriod,
    filters,
    isLoading,
    updateFilters,
    markEmployeeAsPaid,
    markMultipleAsPaid,
    retryPayment,
    generateBankFile,
    downloadPaymentReport,
    refreshData,
    totalEmployees,
    totalAmount
  } = usePayments();

  // Add pagination for payments
  const pagination = usePagination(employees, {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 75, 100],
    storageKey: 'payments'
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showBankFileGenerator, setShowBankFileGenerator] = useState(false);
  const [selectedPaymentForRetry, setSelectedPaymentForRetry] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  const handlePaymentAction = (paymentId: string, action: string) => {
    switch (action) {
      case 'process':
        markEmployeeAsPaid(paymentId, { paymentDate: new Date().toISOString() });
        break;
      case 'markPaid':
        markEmployeeAsPaid(paymentId, { paymentDate: new Date().toISOString() });
        break;
      case 'retry':
        const payment = employees.find(p => p.id === paymentId);
        setSelectedPaymentForRetry(payment);
        setShowRetryModal(true);
        break;
    }
  };

  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'process':
        setShowConfirmationModal(true);
        break;
      case 'generateFile':
        setShowBankFileGenerator(true);
        break;
    }
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const toggleAllPayments = () => {
    setSelectedPayments(prev => 
      prev.length === employees.length ? [] : employees.map(emp => emp.id)
    );
  };

  const processSelectedPayments = () => {
    markMultipleAsPaid(selectedPayments, new Date().toISOString());
    setSelectedPayments([]);
  };

  const clearFilters = () => {
    updateFilters({});
  };

  const handleMarkAsPaid = (employee: any) => {
    markEmployeeAsPaid(employee.id, { paymentDate: new Date().toISOString() });
  };

  const handleRetryPayment = async (employee: any) => {
    return new Promise<boolean>((resolve) => {
      retryPayment(employee.id);
      resolve(true);
    });
  };

  const handleUpdateBankAccount = async (employeeId: string, accountData: any) => {
    // Implementation would go here
    return Promise.resolve(true);
  };

  // Create summary from employees data matching PaymentsSummary interface
  const paidEmployees = employees.filter(emp => emp.paymentStatus === 'pagado');
  const failedEmployees = employees.filter(emp => emp.paymentStatus === 'fallido');
  const totalPaid = paidEmployees.reduce((sum, emp) => sum + emp.netPay, 0);
  const totalFailed = failedEmployees.reduce((sum, emp) => sum + emp.netPay, 0);
  
  const summary = {
    totalEmployees,
    totalAmount,
    totalPaid,
    totalFailed,
    paidCount: paidEmployees.length,
    failedCount: failedEmployees.length,
    pendingPayments: employees.filter(emp => emp.paymentStatus === 'pendiente').length,
    completedPayments: paidEmployees.length,
    failedPayments: failedEmployees.length,
    progressPercentage: totalEmployees > 0 ? Math.round((paidEmployees.length / totalEmployees) * 100) : 0
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PaymentsHeader 
        period={currentPeriod} 
        onDownloadReport={() => downloadPaymentReport(currentPeriod?.id || 'current')}
      />
      
      <div className="p-6 space-y-6">
        <PaymentsSummaryCards summary={summary} />
        
        <PaymentsFilters
          filters={filters}
          onFiltersChange={updateFilters}
          employees={employees}
        />

        <div className="bg-white rounded-lg shadow">
          <PaymentsTable
            employees={pagination.paginatedItems}
            selectedEmployees={selectedPayments}
            onSelectionChange={setSelectedPayments}
            onMarkAsPaid={handleMarkAsPaid}
            onRetryPayment={handleRetryPayment}
            onUpdateBankAccount={handleUpdateBankAccount}
          />
          
          <PaginationControls 
            pagination={pagination} 
            itemName="pagos"
          />
        </div>
      </div>

      {/* Modals */}
      <PaymentConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={() => {
          processSelectedPayments();
          setShowConfirmationModal(false);
        }}
        employee={null}
      />

      <RetryPaymentModal
        isOpen={showRetryModal}
        onClose={() => {
          setShowRetryModal(false);
          setSelectedPaymentForRetry(null);
        }}
        onRetry={async (paymentId) => {
          retryPayment(paymentId);
          setShowRetryModal(false);
          setSelectedPaymentForRetry(null);
          return true;
        }}
        onUpdateAccount={handleUpdateBankAccount}
        employee={selectedPaymentForRetry}
      />

      <BankFileGenerator
        isOpen={showBankFileGenerator}
        onClose={() => setShowBankFileGenerator(false)}
        employees={selectedPayments.map(id => 
          employees.find(p => p.id === id)!
        )}
      />
    </div>
  );
};
