
import { TooltipProvider } from '@/components/ui/tooltip';
import { VoucherHeader } from './VoucherHeader';
import { VoucherFilters } from './VoucherFilters';
import { VoucherTable } from './VoucherTable';
import { VoucherBulkActions } from './VoucherBulkActions';
import { VoucherSummaryCards } from './VoucherSummaryCards';
import { VoucherEmptyState } from './VoucherEmptyState';
import { useVouchers } from '@/hooks/useVouchers';

export const VouchersPage = () => {
  const {
    vouchers,
    allVouchers,
    isLoading,
    filters,
    selectedVouchers,
    summary,
    updateFilters,
    clearFilters,
    toggleVoucherSelection,
    toggleAllVouchers,
    downloadVoucher,
    downloadSelectedVouchers,
    sendVoucherByEmail,
    sendSelectedVouchersByEmail,
    regenerateVoucher,
    refreshVouchers
  } = useVouchers();

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

  if (allVouchers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VoucherHeader />
        <div className="p-6">
          <VoucherEmptyState />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <VoucherHeader 
          totalVouchers={allVouchers.length}
          filteredVouchers={vouchers.length}
        />
        
        <div className="p-6 space-y-6">
          <VoucherSummaryCards summary={summary} />
          
          <VoucherFilters
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
            vouchers={allVouchers}
          />

          {selectedVouchers.length > 0 && (
            <VoucherBulkActions
              selectedCount={selectedVouchers.length}
              onDownload={downloadSelectedVouchers}
              onSendEmail={sendSelectedVouchersByEmail}
            />
          )}

          <VoucherTable
            vouchers={vouchers}
            selectedVouchers={selectedVouchers}
            onToggleSelection={toggleVoucherSelection}
            onToggleAll={toggleAllVouchers}
            onDownload={downloadVoucher}
            onSendEmail={sendVoucherByEmail}
            onRegenerate={regenerateVoucher}
            onClearFilters={clearFilters}
            totalVouchers={allVouchers.length}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};
