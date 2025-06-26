
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

  // Create summary from employees data
  const summary = {
    totalEmployees,
    totalAmount,
    pendingPayments: employees.filter(emp => emp.paymentStatus === 'pendiente').length,
    completedPayments: employees.filter(emp => emp.paymentStatus === 'pagado').length,
    failedPayments: employees.filter(emp => emp.paymentStatus === 'fallido').length
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
          onClearFilters={clearFilters}
          totalCount={totalEmployees}
          filteredCount={employees.length}
        />

        <div className="bg-white rounded-lg shadow">
          <PaymentsTable
            employees={pagination.paginatedItems}
            selectedPayments={selectedPayments}
            onToggleSelection={togglePaymentSelection}
            onToggleAll={toggleAllPayments}
            onPaymentAction={handlePaymentAction}
            onBulkAction={handleBulkAction}
            onClearFilters={clearFilters}
            totalPayments={totalEmployees}
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
        paymentCount={selectedPayments.length}
      />

      <RetryPaymentModal
        isOpen={showRetryModal}
        onClose={() => {
          setShowRetryModal(false);
          setSelectedPaymentForRetry(null);
        }}
        onRetry={(paymentId) => {
          retryPayment(paymentId);
          setShowRetryModal(false);
          setSelectedPaymentForRetry(null);
        }}
        payment={selectedPaymentForRetry}
      />

      <BankFileGenerator
        isOpen={showBankFileGenerator}
        onClose={() => setShowBankFileGenerator(false)}
        employees={selectedPayments.map(id => 
          employees.find(p => p.id === id)!
        )}
        onGenerate={(config) => {
          generateBankFile(config);
          setShowBankFileGenerator(false);
        }}
      />
    </div>
  );
};
