
import { useState } from 'react';
import { VoucherFilters } from '@/types/vouchers';

export const useVoucherFilters = () => {
  const [filters, setFilters] = useState<VoucherFilters>({
    searchTerm: '',
    periodo: '',
    voucherStatus: '',
    sentToEmployee: undefined,
    startDate: '',
    endDate: ''
  });

  const updateFilters = (newFilters: Partial<VoucherFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      periodo: '',
      voucherStatus: '',
      sentToEmployee: undefined,
      startDate: '',
      endDate: ''
    });
  };

  return {
    filters,
    updateFilters,
    clearFilters
  };
};
