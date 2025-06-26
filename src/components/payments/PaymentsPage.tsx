
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
    payments,
    allPayments,
    filters,
    summary,
    selectedPayments,
    isLoading,
    updateFilters,
    clearFilters,
    togglePaymentSelection,
    toggleAllPayments,
    processPayment,
    processSelectedPayments,
    retryPayment,
    generateBankFile,
    markAsPaid,
    refreshPayments
  } = usePayments();

  // Add pagination for payments
  const pagination = usePagination(payments, {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 75, 100],
    storageKey: 'payments'
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showBankFileGenerator, setShowBankFileGenerator] = useState(false);
  const [selectedPaymentForRetry, setSelectedPaymentForRetry] = useState(null);

  const handlePaymentAction = (paymentId: string, action: string) => {
    switch (action) {
      case 'process':
        processPayment(paymentId);
        break;
      case 'markPaid':
        markAsPaid(paymentId);
        break;
      case 'retry':
        const payment = allPayments.find(p => p.id === paymentId);
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
      <PaymentsHeader />
      
      <div className="p-6 space-y-6">
        <PaymentsSummaryCards summary={summary} />
        
        <PaymentsFilters
          filters={filters}
          onUpdateFilters={updateFilters}
          onClearFilters={clearFilters}
          totalCount={allPayments.length}
          filteredCount={payments.length}
        />

        <div className="bg-white rounded-lg shadow">
          <PaymentsTable
            payments={pagination.paginatedItems} // Use paginated payments
            selectedPayments={selectedPayments}
            onToggleSelection={togglePaymentSelection}
            onToggleAll={toggleAllPayments}
            onPaymentAction={handlePaymentAction}
            onBulkAction={handleBulkAction}
            onClearFilters={clearFilters}
            totalPayments={allPayments.length}
          />
          
          {/* Add pagination controls */}
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
        selectedCount={selectedPayments.length}
      />

      <RetryPaymentModal
        isOpen={showRetryModal}
        onClose={() => {
          setShowRetryModal(false);
          setSelectedPaymentForRetry(null);
        }}
        onRetry={(paymentId, config) => {
          retryPayment(paymentId, config);
          setShowRetryModal(false);
          setSelectedPaymentForRetry(null);
        }}
        payment={selectedPaymentForRetry}
      />

      <BankFileGenerator
        isOpen={showBankFileGenerator}
        onClose={() => setShowBankFileGenerator(false)}
        selectedPayments={selectedPayments.map(id => 
          allPayments.find(p => p.id === id)!
        )}
        onGenerate={(config) => {
          generateBankFile(selectedPayments, config);
          setShowBankFileGenerator(false);
        }}
      />
    </div>
  );
};
