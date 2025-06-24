
import { VoucherHeader } from './VoucherHeader';
import { VoucherSummaryCards } from './VoucherSummaryCards';
import { VoucherFiltersComponent } from './VoucherFilters';
import { VoucherBulkActions } from './VoucherBulkActions';
import { VoucherTable } from './VoucherTable';
import { VoucherEmptyState } from './VoucherEmptyState';
import { useVouchers } from '@/hooks/useVouchers';
import { Loader2 } from 'lucide-react';

export const VouchersPage = () => {
  const {
    vouchers,
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
    regenerateVoucher
  } = useVouchers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando comprobantes...</span>
      </div>
    );
  }

  // Estado vacío - no hay nóminas procesadas
  if (vouchers.length === 0 && summary.totalVouchers === 0) {
    return (
      <div className="space-y-6">
        <VoucherHeader />
        <VoucherEmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VoucherHeader />
      
      <VoucherSummaryCards summary={summary} />

      <VoucherFiltersComponent
        filters={filters}
        onUpdateFilters={updateFilters}
        onClearFilters={clearFilters}
        totalCount={summary.totalVouchers}
        filteredCount={vouchers.length}
      />

      <VoucherBulkActions
        selectedCount={selectedVouchers.length}
        onDownloadSelected={downloadSelectedVouchers}
        onSendSelected={sendSelectedVouchersByEmail}
        onDeselectAll={() => toggleAllVouchers()}
      />

      <VoucherTable
        vouchers={vouchers}
        selectedVouchers={selectedVouchers}
        onToggleSelection={toggleVoucherSelection}
        onToggleAll={toggleAllVouchers}
        onDownload={downloadVoucher}
        onSendEmail={sendVoucherByEmail}
        onRegenerate={regenerateVoucher}
        onClearFilters={clearFilters}
        totalVouchers={summary.totalVouchers}
      />
    </div>
  );
};
